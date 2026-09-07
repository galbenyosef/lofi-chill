import { useEffect, useRef, type Dispatch } from 'react';
import { flushSync } from 'react-dom';
import type { Action, Timer } from '@/lib/timer';

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type ToolDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: Tool,
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
};

/** Optional page-scoped tools; ordinary browsers need no polyfill or dependency. */
export function useTimerTools(timer: Timer, dispatch: Dispatch<Action>) {
  const state = useRef(timer);
  useEffect(() => {
    state.current = timer;
  }, [timer]);
  useEffect(() => {
    const context = (document as ToolDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const read = () => ({
      mode: state.current.mode,
      remainingSeconds:
        state.current.deadline === null
          ? state.current.remaining
          : Math.max(
              0,
              Math.ceil((state.current.deadline - Date.now()) / 1000),
            ),
      running: state.current.deadline !== null,
      completedToday: state.current.completed,
    });
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {
          /* Optional browser capability. */
        });
      } catch {
        /* Optional browser capability. */
      }
    };
    register({
      name: 'get_focus_session',
      description:
        'Read the current Pomodoro mode, remaining seconds, running state, and completed sessions.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: read,
    });
    register({
      name: 'control_focus_session',
      description:
        'Start, pause, or reset the visible Pomodoro timer. Does not start audio.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['start', 'pause', 'reset'] },
        },
        required: ['action'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          Object.keys(input).length !== 1 ||
          !('action' in input) ||
          !['start', 'pause', 'reset'].includes(String(input.action))
        )
          throw new Error('Expected action: start, pause, or reset.');
        const action = input.action;
        if (
          action === 'reset' ||
          (action === 'start' && state.current.deadline === null) ||
          (action === 'pause' && state.current.deadline !== null)
        )
          flushSync(() =>
            dispatch({
              type: action === 'reset' ? 'reset' : 'toggle',
              now: Date.now(),
            }),
          );
        return read();
      },
    });
    return () => lifecycle.abort();
  }, [dispatch]);
}
