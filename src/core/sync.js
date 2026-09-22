/* board v3.0 stage-0 */

import {
  getToken,
  emptyBoard,
  isBoardEmpty,
} from './store.js';

const REPO = 'daryaeroshevich9-web/my-board';
const FILE = 'board.json';
const API_URL = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

let suppressPush = false;

export function setSuppressPush(value) {
  suppressPush = !!value;
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

    if (!payload.content) {
      return {
        ok: true,
        empty: true,
        data: emptyBoard(),
        sha: payload.sha || null,
      };
    }

    const text = decodeBase64Utf8(payload.content);
    const data = JSON.parse(text);

    return {
      ok: true,
      empty: isBoardEmpty(data),
      data,
      sha: payload.sha || null,
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
    let currentSha = sha;

    if (!currentSha) {
      const readResult = await cloudRead();
      if (readResult.ok && readResult.sha) {
        currentSha = readResult.sha;
      }
    }

    const body = {
      message: 'update: board data',
      content: encodeUtf8Base64(JSON.stringify(data)),
    };

    if (currentSha) {
      body.sha = currentSha;
    }

    let response = await putFile(body);

    if (response.status === 409 || response.status === 422) {
      const fresh = await cloudRead();

      if (fresh.ok) {
        if (fresh.sha) {
          body.sha = fresh.sha;
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

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      reason: 'network',
    };
  }
}
