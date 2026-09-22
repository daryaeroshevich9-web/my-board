/* board v3.0 stage-1 */

import {
  getToken,
  emptyBoard,
  isBoardEmpty,
} from './store.js';

const REPO = 'daryaeroshevich9-web/my-board';
const FILE = 'board.json';
const API_URL = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

let suppressPush = false;
let currentSha = null;

export function setSuppressPush(value) {
  suppressPush = !!value;
}

export function getSha() {
  return currentSha;
}

function authHeaders() {
  const token = getToken();

  const headers = {
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function decodeBase64Utf8(base64) {
  const normalized = String(base64 || '').replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function encodeUtf8Base64(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

export async function cloudRead() {
  const token = getToken();

  if (!token) {
    return {
      ok: false,
      reason: 'no-token',
    };
  }

  try {
    const response = await fetch(API_URL, {
      headers: authHeaders(),
    });

    if (response.status === 404) {
      currentSha = null;

      return {
        ok: true,
        empty: true,
        data: emptyBoard(),
        sha: null,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
      };
    }

    const payload = await response.json();
    currentSha = payload.sha || null;

    if (!payload.content) {
      return {
        ok: true,
        empty: true,
        data: emptyBoard(),
        sha: currentSha,
      };
    }

    const text = decodeBase64Utf8(payload.content);
    const data = JSON.parse(text);

    return {
      ok: true,
      empty: isBoardEmpty(data),
      data,
      sha: currentSha,
    };
  } catch {
    return {
      ok: false,
      reason: 'network',
    };
  }
}

async function putFile(body) {
  return fetch(API_URL, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function cloudWrite(data, sha = null) {
  if (!getToken()) {
    return {
      ok: false,
      reason: 'no-token',
    };
  }

  if (suppressPush) {
    return {
      ok: false,
      reason: 'suppressed',
    };
  }

  try {
    let requestedSha = sha ?? currentSha;

    if (!requestedSha) {
      const readResult = await cloudRead();

      if (readResult.ok && readResult.sha) {
        requestedSha = readResult.sha;
      }
    }

    const body = {
      message: 'update: board data',
      content: encodeUtf8Base64(JSON.stringify(data)),
    };

    if (requestedSha) {
      body.sha = requestedSha;
    }

    let response = await putFile(body);

    if (response.status === 409 || response.status === 422) {
      const fresh = await cloudRead();

      if (fresh.ok) {
        requestedSha = fresh.sha;

        if (requestedSha) {
          body.sha = requestedSha;
        } else {
          delete body.sha;
        }

        response = await putFile(body);
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
      };
    }

    const payload = await response.json();

    if (payload?.content?.sha) {
      currentSha = payload.content.sha;
    }

    return {
      ok: true,
      sha: currentSha,
    };
  } catch {
    return {
      ok: false,
      reason: 'network',
    };
  }
}
