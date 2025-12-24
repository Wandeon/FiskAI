import { useReducer, useCallback } from "react"
import type {
  Surface,
  AssistantControllerState,
  AssistantResponse,
  AssistantError,
  HistoryItem,
} from "../types"

interface UseAssistantControllerProps {
  surface: Surface
}

type Action =
  | { type: "SUBMIT"; query: string; requestId: string }
  | { type: "STREAM_START" }
  | { type: "STREAM_UPDATE"; data: Partial<AssistantResponse> }
  | { type: "COMPLETE"; response: AssistantResponse }
  | { type: "ERROR"; error: AssistantError }
  | { type: "CANCEL" }
  | { type: "RESTORE_HISTORY"; index: number }
  | { type: "CLEAR_HISTORY" }
  | { type: "RETRY" }

const initialState: AssistantControllerState = {
  status: "IDLE",
  activeRequestId: null,
  activeQuery: null,
  activeAnswer: null,
  history: [],
  error: null,
  retryCount: 0,
  streamProgress: {
    headline: false,
    directAnswer: false,
    citations: false,
    clientContext: false,
  },
}

function reducer(state: AssistantControllerState, action: Action): AssistantControllerState {
  switch (action.type) {
    case "SUBMIT":
      return {
        ...state,
        status: "LOADING",
        activeRequestId: action.requestId,
        activeQuery: action.query,
        activeAnswer: null,
        error: null,
        streamProgress: {
          headline: false,
          directAnswer: false,
          citations: false,
          clientContext: false,
        },
      }
    default:
      return state
  }
}

export function useAssistantController({ surface }: UseAssistantControllerProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    state,
    surface,
    dispatch,
  }
}
