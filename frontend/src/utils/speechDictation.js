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

export function buildDictatedText(results) {
  const finals = [];
  let interim = '';

  for (let i = 0; i < results.length; i += 1) {
    const text = results[i][0]?.transcript?.trim() ?? '';
    if (!text) continue;

    if (results[i].isFinal) {
      finals.push(text);
    } else {
      interim = text;
    }
  }

  if (finals.length === 0) {
    return { dictated: '', interim };
  }

  if (finals.length === 1) {
    return { dictated: finals[0], interim };
  }

  const areCumulative = finals.every((part, index) => {
    if (index === 0) return true;
    const previous = finals[index - 1].toLowerCase();
    const current = part.toLowerCase();
    return current.startsWith(previous) || current.includes(previous);
  });

  return {
    dictated: areCumulative ? finals[finals.length - 1] : finals.join(' '),
    interim,
  };
}

export function joinTextParts(...parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
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
