import { useEffect, useRef, useState } from 'react';
import {
  getMicBlockMessage,
  getSpeechRecognition,
  joinTextParts,
  mergeSessionFinal,
  processRecognitionEvent,
  requestMicrophoneAccess,
} from './speechDictation.js';

export function useSpeechDictation({ text, onTextChange, active = true }) {
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [needsHttps, setNeedsHttps] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [requestingMic, setRequestingMic] = useState(false);
  const recognitionRef = useRef(null);
  const dictationBaseRef = useRef('');
  const sessionDictatedRef = useRef('');
  const textRef = useRef(text);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
    setNeedsHttps(typeof window !== 'undefined' && !window.isSecureContext);
  }, []);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!active) {
      stopListening();
      setSpeechError('');
      setRequestingMic(false);
    }
  }, [active]);

  useEffect(() => () => stopListening(), []);

  function stopListening() {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Recognition may already be stopped.
      }
      recognitionRef.current = null;
    }

    dictationBaseRef.current = textRef.current.trim();
    sessionDictatedRef.current = '';
    setListening(false);
  }

  function beginRecognition() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setSpeechError(getMicBlockMessage('unsupported'));
      return;
    }

    dictationBaseRef.current = textRef.current.trim();
    sessionDictatedRef.current = '';

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const { sessionUpdate, interim } = processRecognitionEvent(
        event.results,
        event.resultIndex,
      );

      if (sessionUpdate !== null) {
        sessionDictatedRef.current = mergeSessionFinal(
          sessionDictatedRef.current,
          sessionUpdate,
        );
      }

      onTextChange(joinTextParts(
        dictationBaseRef.current,
        sessionDictatedRef.current,
        interim,
      ));
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setSpeechError(getMicBlockMessage('denied'));
      } else if (event.error !== 'aborted') {
        setSpeechError('No se pudo capturar el audio. Intenta de nuevo o escribe el texto.');
      }
      stopListening();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      dictationBaseRef.current = textRef.current.trim();
      sessionDictatedRef.current = '';
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function startListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setSpeechError(getMicBlockMessage('unsupported'));
      return;
    }

    setSpeechError('');
    setRequestingMic(true);

    const access = await requestMicrophoneAccess();
    setRequestingMic(false);

    if (!access.ok) {
      setSpeechError(getMicBlockMessage(access.reason));
      return;
    }

    beginRecognition();
  }

  async function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    await startListening();
  }

  function handleManualTextChange(nextText) {
    onTextChange(nextText);
    if (listening) {
      dictationBaseRef.current = nextText.trim();
      sessionDictatedRef.current = '';
    }
  }

  const canDictate = speechSupported && !needsHttps;

  return {
    listening,
    requestingMic,
    speechError,
    canDictate,
    needsHttps,
    toggleListening,
    stopListening,
    handleManualTextChange,
  };
}
