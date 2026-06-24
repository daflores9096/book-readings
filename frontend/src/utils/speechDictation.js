export function getSpeechRecognition() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function getMicBlockMessage(reason) {
  switch (reason) {
    case 'insecure':
      return 'El micrófono requiere HTTPS. Si entras por http:// (NAS o IP local), Chrome Android lo bloqueará. Configura HTTPS en Synology (Proxy inverso + certificado) o accede con https://.';
    case 'denied':
      return 'Permiso de micrófono denegado. En Chrome: toca el candado (o ⋮) → Configuración del sitio → Micrófono → Permitir. Luego recarga la página e intenta de nuevo.';
    case 'unsupported':
      return 'Este navegador no expone el micrófono. Usa Chrome en Android o escribe a mano.';
    default:
      return 'No se pudo acceder al micrófono. Intenta de nuevo o escribe a mano.';
  }
}

export function joinTextParts(...parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function mergeSessionFinal(existing, incoming) {
  const next = incoming?.trim() ?? '';
  if (!next) return existing?.trim() ?? '';

  const prev = existing?.trim() ?? '';
  if (!prev) return next;

  const prevLower = prev.toLowerCase();
  const nextLower = next.toLowerCase();
  if (nextLower.startsWith(prevLower) || nextLower.includes(prevLower)) {
    return next;
  }

  return joinTextParts(prev, next);
}

export function processRecognitionEvent(results, resultIndex = 0) {
  let interim = '';
  let sessionUpdate = null;

  for (let i = resultIndex; i < results.length; i += 1) {
    const text = results[i][0]?.transcript?.trim() ?? '';
    if (!text) continue;

    if (results[i].isFinal) {
      sessionUpdate = sessionUpdate === null
        ? text
        : mergeSessionFinal(sessionUpdate, text);
    } else {
      interim = text;
    }
  }

  return { sessionUpdate, interim };
}

export async function requestMicrophoneAccess() {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  if (!window.isSecureContext) {
    return { ok: false, reason: 'insecure' };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      return { ok: false, reason: 'denied' };
    }
    return { ok: false, reason: 'error', message: err?.message };
  }
}
