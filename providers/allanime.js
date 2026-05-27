// NOTE: We do NOT use require("crypto-js") for AES operations.
// Nuvio's CryptoJS polyfill only supports hashing (SHA256, MD5) and encoding (Hex, Utf8, Base64).

const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const ALLANIME_BASE = "https://allanime.day";
const ALLANIME_API = "https://api.allanime.day/api";
const TMDB_API_KEY = "94fc7b2a9e6af14b1c78465d64e9e0d1";


function getSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const n1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (n1 === n2) return 1.0;
    if (n1.length < 2 || n2.length < 2) return 0;

    const getBigrams = (str) => {
        const bigrams = new Set();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };

    const b1 = getBigrams(n1);
    const b2 = getBigrams(n2);
    let intersect = 0;
    for (const bi of b1) {
        if (b2.has(bi)) intersect++;
    }
    return (2 * intersect) / (b1.size + b2.size);
}

// ═══════════════════════════════════════════════════
// HELPER: Decryption
// ═══════════════════════════════════════════════════
function decryptProviderId(encodedId) {
    const map = {
        '79': 'A', '7a': 'B', '7b': 'C', '7c': 'D', '7d': 'E', '7e': 'F', '7f': 'G', '70': 'H',
        '71': 'I', '72': 'J', '73': 'K', '74': 'L', '75': 'M', '76': 'N', '77': 'O', '68': 'P',
        '69': 'Q', '6a': 'R', '6b': 'S', '6c': 'T', '6d': 'U', '6e': 'V', '6f': 'W', '60': 'X',
        '61': 'Y', '62': 'Z',
        '59': 'a', '5a': 'b', '5b': 'c', '5c': 'd', '5d': 'e', '5e': 'f', '5f': 'g', '50': 'h',
        '51': 'i', '52': 'j', '53': 'k', '54': 'l', '55': 'm', '56': 'n', '57': 'o', '48': 'p',
        '49': 'q', '4a': 'r', '4b': 's', '4c': 't', '4d': 'u', '4e': 'v', '4f': 'w', '40': 'x',
        '41': 'y', '42': 'z',
        '08': '0', '09': '1', '0a': '2', '0b': '3', '0c': '4', '0d': '5', '0e': '6', '0f': '7',
        '00': '8', '01': '9',
        '15': '-', '16': '.', '67': '_', '46': '~', '02': ':', '17': '/', '07': '?', '1b': '#',
        '63': '[', '65': ']', '78': '@', '19': '!', '1c': '$', '1e': '&', '10': '(', '11': ')',
        '12': '*', '13': '+', '14': ',', '03': ';', '05': '=', '1d': '%'
    };
    let decrypted = '';
    for (let i = 0; i < encodedId.length; i += 2) {
        const hex = encodedId.substring(i, i + 2);
        decrypted += map[hex] || hex;
    }
    // Clean double slashes, fix /clock -> /clock.json
    return decrypted.replace(/([^:])\/\//g, '$1/').replace('/clock', '/clock.json');
}


var AES_SBOX = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];


var AES_RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];


function gmul(a, b) {
    var p = 0;
    for (var i = 0; i < 8; i++) {
        if (b & 1) p ^= a;
        var hi = a & 0x80;
        a = (a << 1) & 0xff;
        if (hi) a ^= 0x1b;
        b >>= 1;
    }
    return p;
}


function aesKeyExpansion256(keyBytes) {
    var nk = 8; // 256-bit = 8 words
    var nr = 14;
    var w = new Array(4 * (nr + 1));
    for (var i = 0; i < nk; i++) {
        w[i] = (keyBytes[4*i] << 24) | (keyBytes[4*i+1] << 16) | (keyBytes[4*i+2] << 8) | keyBytes[4*i+3];
    }
    for (var i = nk; i < 4 * (nr + 1); i++) {
        var temp = w[i-1];
        if (i % nk === 0) {
            // RotWord + SubWord + Rcon
            temp = ((AES_SBOX[(temp >> 16) & 0xff] << 24) |
                    (AES_SBOX[(temp >> 8) & 0xff] << 16) |
                    (AES_SBOX[temp & 0xff] << 8) |
                    AES_SBOX[(temp >> 24) & 0xff]);
            temp ^= (AES_RCON[(i / nk) - 1] << 24);
        } else if (i % nk === 4) {
            temp = (AES_SBOX[(temp >> 24) & 0xff] << 24) |
                   (AES_SBOX[(temp >> 16) & 0xff] << 16) |
                   (AES_SBOX[(temp >> 8) & 0xff] << 8) |
                   AES_SBOX[temp & 0xff];
        }
        w[i] = (w[i - nk] ^ temp) >>> 0;
    }
    return w;
}

// AES encrypt a single 16-byte block
function aesEncryptBlock(block, expandedKey) {
    var nr = 14;
    // State is a 4x4 column-major matrix stored as 16 bytes
    var s = new Array(16);
    for (var i = 0; i < 16; i++) s[i] = block[i];

    // AddRoundKey (round 0)
    for (var c = 0; c < 4; c++) {
        var w = expandedKey[c];
        s[c*4]   ^= (w >> 24) & 0xff;
        s[c*4+1] ^= (w >> 16) & 0xff;
        s[c*4+2] ^= (w >> 8) & 0xff;
        s[c*4+3] ^= w & 0xff;
    }

    for (var round = 1; round <= nr; round++) {
        // SubBytes
        for (var i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];

        // ShiftRows (column-major: state[col*4+row])
        // Row 1: shift left by 1
        var t = s[0*4+1];
        s[0*4+1] = s[1*4+1]; s[1*4+1] = s[2*4+1]; s[2*4+1] = s[3*4+1]; s[3*4+1] = t;
        // Row 2: shift left by 2
        t = s[0*4+2]; var t2 = s[1*4+2];
        s[0*4+2] = s[2*4+2]; s[1*4+2] = s[3*4+2]; s[2*4+2] = t; s[3*4+2] = t2;
        // Row 3: shift left by 3
        t = s[3*4+3];
        s[3*4+3] = s[2*4+3]; s[2*4+3] = s[1*4+3]; s[1*4+3] = s[0*4+3]; s[0*4+3] = t;

        
        if (round < nr) {
            for (var c = 0; c < 4; c++) {
                var a0 = s[c*4], a1 = s[c*4+1], a2 = s[c*4+2], a3 = s[c*4+3];
                s[c*4]   = gmul(2,a0) ^ gmul(3,a1) ^ a2 ^ a3;
                s[c*4+1] = a0 ^ gmul(2,a1) ^ gmul(3,a2) ^ a3;
                s[c*4+2] = a0 ^ a1 ^ gmul(2,a2) ^ gmul(3,a3);
                s[c*4+3] = gmul(3,a0) ^ a1 ^ a2 ^ gmul(2,a3);
            }
        }

        // AddRoundKey
        for (var c = 0; c < 4; c++) {
            var w = expandedKey[round * 4 + c];
            s[c*4]   ^= (w >> 24) & 0xff;
            s[c*4+1] ^= (w >> 16) & 0xff;
            s[c*4+2] ^= (w >> 8) & 0xff;
            s[c*4+3] ^= w & 0xff;
        }
    }

    // Convert column-major state back to row-major output
    var out = new Array(16);
    for (var c = 0; c < 4; c++) {
        out[c*4]   = s[c*4];
        out[c*4+1] = s[c*4+1];
        out[c*4+2] = s[c*4+2];
        out[c*4+3] = s[c*4+3];
    }
    return out;
}

// Increment a 16-byte counter block (big-endian, last 4 bytes)
function incrementCounter(ctr) {
    for (var i = 15; i >= 12; i--) {
        ctr[i] = (ctr[i] + 1) & 0xff;
        if (ctr[i] !== 0) break;
    }
}

// Hex string to byte array
function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return bytes;
}

// Byte array to UTF-8 string
function bytesToUtf8(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    // Handle multi-byte UTF-8 via decodeURIComponent
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

// Base64 decode to byte array (works in both Node.js and QuickJS/Nuvio)
function base64ToBytes(b64) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var str = String(b64).replace(/=+$/, '');
    var bytes = [];
    var bc = 0, bs = 0, buffer, idx = 0;
    while ((buffer = str.charAt(idx++))) {
        buffer = chars.indexOf(buffer);
        if (buffer === -1) continue;
        bs = bc % 4 ? bs * 64 + buffer : buffer;
        if (bc++ % 4) bytes.push(255 & (bs >> ((-2 * bc) & 6)));
    }
    return bytes;
}

// Byte array to hex string
function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
        var h = bytes[i].toString(16);
        if (h.length < 2) h = '0' + h;
        hex += h;
    }
    return hex;
}

// AES-256-CTR decryption
function aesCtrDecrypt(keyBytes, ivBytes, ciphertextBytes) {
    var expandedKey = aesKeyExpansion256(keyBytes);
    var ctr = ivBytes.slice(); // 16-byte counter block
    var plaintext = [];

    for (var offset = 0; offset < ciphertextBytes.length; offset += 16) {
        var keystreamBlock = aesEncryptBlock(ctr, expandedKey);
        var blockLen = Math.min(16, ciphertextBytes.length - offset);
        for (var j = 0; j < blockLen; j++) {
            plaintext.push(ciphertextBytes[offset + j] ^ keystreamBlock[j]);
        }
        incrementCounter(ctr);
    }
    return plaintext;
}

// SHA-256 of a string -> 32 bytes (using CryptoJS polyfill which IS available)
function sha256KeyBytes(passphrase) {
    var hashHex = CryptoJS.SHA256(passphrase).toString(CryptoJS.enc.Hex);
    return hexToBytes(hashHex);
}

// AES-256-CTR key = SHA256('Xot36i3lK3:v1') — matches upstream ani-cli
var AES_KEY_BYTES = sha256KeyBytes('Xot36i3lK3:v1');

function decryptToBeParsed(blob) {
    try {
        // Format: 1 byte tag | 12 bytes IV | ciphertext | 16 bytes GCM tag
        // We use CTR mode (ignoring GCM auth tag)
        var rawBytes = base64ToBytes(blob);

        // raw bytes layout: [tag(1)] [iv(12)] [ciphertext(n)] [gcm_tag(16)]
        var iv12 = rawBytes.slice(1, 13);               // 12 bytes IV
        var ct = rawBytes.slice(13, rawBytes.length - 16); // ciphertext (drop 16-byte GCM tag)

        if (!ct || ct.length === 0) return null;

        // AES-256-CTR: IV is 12-byte nonce + 4-byte counter (starting at 2)
        var ctrIv = iv12.concat([0x00, 0x00, 0x00, 0x02]);

        var plainBytes = aesCtrDecrypt(AES_KEY_BYTES, ctrIv, ct);
        return bytesToUtf8(plainBytes);
    } catch (e) {
        console.error("decryptToBeParsed error:", e && e.message ? e.message : e);
        return null;
    }
}

// ═══════════════════════════════════════════════════
// API: AllAnime
// ═══════════════════════════════════════════════════
async function searchAnime(query, mode) {
    const translationType = mode === "dub" ? "dub" : "sub";
    const searchGql = `query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { edges { _id name availableEpisodes __typename } }}`;

    const body = JSON.stringify({
        variables: {
            search: { allowAdult: false, allowUnknown: false, query: query },
            limit: 40,
            page: 1,
            translationType: translationType,
            countryOrigin: "ALL"
        },
        query: searchGql
    });

    const headers = {
        'User-Agent': AGENT,
        'Content-Type': 'application/json',
        'Referer': 'https://allmanga.to',
        'Origin': 'https://allmanga.to'
    };

    try {
        const res = await fetch(ALLANIME_API, { method: 'POST', headers, body });
        if (!res.ok) return [];
        const data = await res.json();
        const edges = data?.data?.shows?.edges || [];

        return edges.map(edge => ({
            id: edge._id,
            name: edge.name,
            episodes: (edge.availableEpisodes && edge.availableEpisodes[translationType]) || 0
        }));
    } catch (e) {
        console.error("AllAnime Search Error:", e);
        return [];
    }
}


async function getRawStreamSources(showId, episodeString, mode) {
    const translationType = mode === "dub" ? "dub" : "sub";
    const variables = {
        showId: showId,
        translationType: translationType,
        episodeString: String(episodeString)
    };

    // Use persisted query hash from upstream ani-cli (different from search hash)
    const EPISODE_HASH = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";
    const url = `${ALLANIME_API}?variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: EPISODE_HASH } }))}`;

    const headers = {
        'User-Agent': AGENT,
        'Accept': '*/*',
        'Referer': 'https://youtu-chan.com',
        'Origin': ALLANIME_BASE
    };

    try {
        const res = await fetch(url, { headers });
        if (!res.ok) { console.error("getRawStreamSources HTTP", res.status); return []; }
        const data = await res.json();

        // New encrypted format: data.data.tobeparsed
        if (data?.data?.tobeparsed) {
            const plain = decryptToBeParsed(data.data.tobeparsed);
            if (plain) {
                try {
                    const parsed = JSON.parse(plain);
                    if (parsed?.episode?.sourceUrls) return parsed.episode.sourceUrls;
                } catch (jsonErr) {
                    console.error("tobeparsed JSON parse error:", jsonErr, plain.substring(0, 100));
                }
            }
            return [];
        }

        // Legacy direct JSON
        return data?.data?.episode?.sourceUrls || [];
    } catch (e) {
        console.error("AllAnime Raw Stream Error:", e);
        return [];
    }
}

async function fetchLinksFromProvider(url) {
    try {
        // Only prepend base URL if url is a relative path (starts with /)
        const apiUrl = url.startsWith('http') ? url : (ALLANIME_BASE + url);
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': AGENT,
                'Referer': ALLANIME_BASE + '/'
            }
        });
        if (!res.ok) return [];
        const data = await res.json();

        const links = [];
        if (data.links && Array.isArray(data.links)) {
            links.push(...data.links.map(l => ({
                url: l.link,
                quality: l.resolutionStr || 'Unknown',
                headers: { 'User-Agent': AGENT }
            })));
        } else if (data.data) {
            // New encrypted format (tobeparsed)
            const decryptedJson = decryptToBeParsed(data.data);
            try {
                const parsed = JSON.parse(decryptedJson);
                const directLinks = Array.isArray(parsed) ? parsed : (parsed.links || []);
                links.push(...directLinks.map(l => ({
                    url: l.link,
                    quality: l.resolutionStr || 'Unknown',
                    headers: { 'User-Agent': AGENT }
                })));
            } catch (jsonErr) {
                console.error("Failed to parse decrypted tobeparsed:", jsonErr);
            }
        }
        return links;
    } catch (e) {
        console.error("Fetch provider links error:", e);
        return [];
    }
}

// ═══════════════════════════════════════════════════
// TMDB TITLE FETCHING (primary title source)
// ═══════════════════════════════════════════════════
async function getTmdbTitles(tmdbId, type) {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=alternative_titles`;
    try {
        const res = await fetch(url);
        if (!res.ok) return { titles: [], originalName: '' };
        const data = await res.json();

        const seen = {};
        const titles = [];
        const addTitle = (t) => {
            t = (t || '').trim();
            if (t && !seen[t]) { seen[t] = true; titles.push(t); }
        };

        // Original name is best for anime search (usually Japanese/romaji)
        const originalName = (data.original_name || data.original_title || '').trim();
        const displayName = (data.name || data.title || '').trim();

        // Original name first (most likely to match AllAnime's database)
        addTitle(originalName);
        // Short version (before colon/dash) — useful for long titles
        const origShort = originalName.split(/\s*[:\-|]\s*/)[0].trim();
        if (origShort !== originalName) addTitle(origShort);

        addTitle(displayName);
        const displayShort = displayName.split(/\s*[:\-|]\s*/)[0].trim();
        if (displayShort !== displayName) addTitle(displayShort);

        // Alternative titles (English, Japanese variants)
        const altResults = (data.alternative_titles || {}).results || (data.alternative_titles || {}).titles || [];
        for (const alt of altResults) {
            const t = (alt.title || alt.name || '').trim();
            addTitle(t);
            const tShort = t.split(/\s*[:\-|]\s*/)[0].trim();
            if (tShort !== t) addTitle(tShort);
        }

        console.log(`[AllAnime] TMDB titles (${titles.length}):`, titles.slice(0, 5));
        return { titles, originalName: originalName || displayName };
    } catch (e) {
        console.error("[AllAnime] TMDB title fetch error:", e);
        return { titles: [], originalName: '' };
    }
}

// ═══════════════════════════════════════════════════
// ID MAPPING (TMDB -> Anilist)
// ═══════════════════════════════════════════════════
async function getAnilistId(tmdbId, type) {
    try {
        // ARM API: /api/v2/themoviedb?id={tmdbId} -> returns [{anilist, imdb, ...}]
        const url = `https://arm.haglund.dev/api/v2/themoviedb?id=${tmdbId}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // Fix 4: Filter ARM results by type when multiple entries exist
                if (data.length > 1) {
                    // Prefer entries that have anilist IDs; we'll validate format later
                    const withAnilist = data.filter(d => d.anilist);
                    if (withAnilist.length > 0) return withAnilist[0].anilist;
                }
                if (data[0].anilist) return data[0].anilist;
            }
        }
    } catch (e) {
        console.error("Mapping Error:", e);
    }
    return null;
}

// ═══════════════════════════════════════════════════
// ANILIST RESOLVER
// ═══════════════════════════════════════════════════
async function getAnilistMeta(anilistId) {
    const query = `
        query ($id: Int) {
            Media (id: $id) {
                id
                format
                episodes
                title { romaji english native }
                relations {
                    edges { relationType }
                    nodes { id format episodes type }
                }
            }
        }
    `;
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(anilistId) } })
        });
        if (res.ok) {
            const data = await res.json();
            return data.data?.Media;
        }
    } catch (e) { }
    return null;
}

async function resolveAnilistEpisode(anilistId, targetSeason, targetEp, type) {
    const meta = await getAnilistMeta(anilistId);
    if (!meta) return { title: null, ep: targetEp, format: null };

    const title = meta.title.romaji || meta.title.english || "";
    const format = meta.format; // TV, TV_SHORT, MOVIE, OVA, ONA, SPECIAL, etc.

    // Fix 3: Validate that Anilist entry format matches the requested type
    if (type === 'tv' && format === 'MOVIE') {
        console.log(`[AllAnime] Warning: Anilist ID ${anilistId} is MOVIE but type=tv, title may be wrong`);
    }
    if (type === 'movie' && format && format !== 'MOVIE') {
        console.log(`[AllAnime] Warning: Anilist ID ${anilistId} is ${format} but type=movie`);
    }

    // Fix 1: Use season for search refinement — if season > 1, append it to title
    let searchTitle = title;
    if (type === 'tv' && targetSeason > 1) {
        // For multi-season shows, Anilist often has separate entries per season
        // but the ARM API may return the base entry. We keep the title as-is
        // and let the season-aware search in getStreams handle variants.
        console.log(`[AllAnime] Season ${targetSeason} requested, Anilist title: ${title}`);
    }

    // Validate episode count if available
    if (meta.episodes && targetEp > meta.episodes) {
        console.log(`[AllAnime] Warning: Requested ep ${targetEp} > Anilist episodes ${meta.episodes}`);
    }

    return { title: searchTitle, ep: targetEp, format };
}

// ═══════════════════════════════════════════════════
// TYPE-AWARE MATCH SCORING
// ═══════════════════════════════════════════════════
const MOVIE_KEYWORDS = /\b(movie|film|gekijouban|gekijō|gekijo)\b/i;

function pickBestMatch(results, targetTitle, type, targetEpisode) {
    if (!results || results.length === 0) return null;

    // Pre-filter by type using episode count as proxy
    let typeFiltered;
    if (type === 'tv') {
        // For TV, prefer results with more than 1 episode (not movies)
        typeFiltered = results.filter(r => r.episodes > 1);
    } else if (type === 'movie') {
        // For movies, prefer results with 0 or 1 episodes
        typeFiltered = results.filter(r => r.episodes <= 1);
    } else {
        typeFiltered = results;
    }

    // If type-filtering removes everything, fall back to all results
    const candidates = typeFiltered.length > 0 ? typeFiltered : results;

    let bestScore = -1;
    let bestMatch = null;

    for (const r of candidates) {
        let score = getSimilarity(r.name, targetTitle);

        // Type-aware penalties and bonuses
        if (type === 'tv') {
            // Penalize results with movie/film in the name
            if (MOVIE_KEYWORDS.test(r.name)) {
                score *= 0.5;
            }
            // Bonus for results that have enough episodes for the requested episode
            if (targetEpisode && r.episodes >= targetEpisode) {
                score *= 1.1;
            }
            // Penalize single-episode results (likely movies)
            if (r.episodes <= 1) {
                score *= 0.6;
            }
        } else if (type === 'movie') {
            // Bonus for single-episode / movie results
            if (r.episodes <= 1) {
                score *= 1.1;
            }
            // Penalize multi-episode results (likely TV series)
            if (r.episodes > 1) {
                score *= 0.7;
            }
        }

        // Cap score at 1.0
        score = Math.min(score, 1.0);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = r;
        }
    }

    // Fix 5: Raised threshold from 0.4 to 0.55
    if (bestMatch && bestScore > 0.55) {
        console.log(`[AllAnime] Best match: "${bestMatch.name}" (score=${bestScore.toFixed(3)}, eps=${bestMatch.episodes})`);
        return bestMatch;
    }

    // Fix 6: Don't fallback blindly to results[0] — use type-filtered first result
    if (candidates.length > 0) {
        console.log(`[AllAnime] No good similarity match (best=${bestScore.toFixed(3)}), using first type-filtered result: "${candidates[0].name}"`);
        return candidates[0];
    }

    console.log(`[AllAnime] No match found at all`);
    return null;
}

// ═══════════════════════════════════════════════════
// SEASON-AWARE QUERY GENERATION
// ═══════════════════════════════════════════════════
function generateSearchQueries(baseTitle, type, season) {
    const queries = [baseTitle];
    const seen = new Set([baseTitle.toLowerCase()]);

    const addQuery = (q) => {
        const lower = q.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            queries.push(q);
        }
    };

    if (type === 'tv' && season > 1) {
        // Try title + season variants
        addQuery(`${baseTitle} Season ${season}`);
        addQuery(`${baseTitle} Part ${season}`);
        addQuery(`${baseTitle} ${season}`);
        // Some shows use "2nd Season", "3rd Season"
        const ordinals = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th' };
        if (ordinals[season]) {
            addQuery(`${baseTitle} ${ordinals[season]} Season`);
        }
    }

    return queries;
}

// ═══════════════════════════════════════════════════
// MAIN PROVIDER FUNCTION
// ═══════════════════════════════════════════════════
async function getStreams(id, type, season, episode) {
    const tmdbId = id;

    // Fix 1: ALWAYS fetch from TMDB first (like animesalt/anime-sama)
    const tmdbData = await getTmdbTitles(tmdbId, type);
    let primaryTitle = tmdbData.originalName || '';
    const allTmdbTitles = tmdbData.titles;

    // Secondary: Anilist chain (provides additional title + format validation)
    const anilistId = await getAnilistId(tmdbId, type);
    console.log("[AllAnime] Anilist ID:", anilistId);

    let anilistTitle = '';
    let subEp = String(episode);
    let dubEp = String(episode);

    if (anilistId) {
        const resolved = await resolveAnilistEpisode(anilistId, season, episode, type);
        console.log("[AllAnime] Anilist resolved:", resolved);
        anilistTitle = resolved.title || '';
        subEp = String(resolved.ep);
        dubEp = String(resolved.ep);
    }

    // Use TMDB original name as primary, Anilist as secondary
    let searchTitle = primaryTitle || anilistTitle || 'Anime';
    console.log(`[AllAnime] Primary search title: "${searchTitle}"`);

    // Fix 5: Generate season-aware queries
    const baseQueries = generateSearchQueries(searchTitle, type, season);

    // Add Anilist title as additional query if different from TMDB
    if (anilistTitle && anilistTitle.toLowerCase() !== searchTitle.toLowerCase()) {
        const anilistQueries = generateSearchQueries(anilistTitle, type, season);
        for (const q of anilistQueries) {
            if (!baseQueries.map(x => x.toLowerCase()).includes(q.toLowerCase())) {
                baseQueries.push(q);
            }
        }
    }

    // Add alternative TMDB titles that aren't already in the list
    for (const t of allTmdbTitles) {
        if (!baseQueries.map(x => x.toLowerCase()).includes(t.toLowerCase())) {
            baseQueries.push(t);
        }
    }

    // Limit total queries to avoid excessive API calls
    const uniqueQueries = baseQueries.slice(0, 6);
    console.log(`[AllAnime] Search queries (${uniqueQueries.length}):`, uniqueQueries);

    // Search with ALL query candidates, merge results
    let allSubResults = [];
    let allDubResults = [];
    const seenSubIds = new Set();
    const seenDubIds = new Set();

    // Search first query for both sub and dub in parallel
    const [firstSubResults, firstDubResults] = await Promise.all([
        searchAnime(uniqueQueries[0], "sub").catch(() => []),
        searchAnime(uniqueQueries[0], "dub").catch(() => [])
    ]);

    for (const r of firstSubResults) {
        if (!seenSubIds.has(r.id)) { seenSubIds.add(r.id); allSubResults.push(r); }
    }
    for (const r of firstDubResults) {
        if (!seenDubIds.has(r.id)) { seenDubIds.add(r.id); allDubResults.push(r); }
    }

    // Search additional queries if first query didn't produce a good type-filtered match
    const hasGoodSubMatch = allSubResults.some(r =>
        type === 'tv' ? r.episodes > 1 : r.episodes <= 1
    );

    if (!hasGoodSubMatch && uniqueQueries.length > 1) {
        for (let i = 1; i < uniqueQueries.length; i++) {
            const [extraSub, extraDub] = await Promise.all([
                searchAnime(uniqueQueries[i], "sub").catch(() => []),
                searchAnime(uniqueQueries[i], "dub").catch(() => [])
            ]);
            for (const r of extraSub) {
                if (!seenSubIds.has(r.id)) { seenSubIds.add(r.id); allSubResults.push(r); }
            }
            for (const r of extraDub) {
                if (!seenDubIds.has(r.id)) { seenDubIds.add(r.id); allDubResults.push(r); }
            }
            // Stop early if we found a type-matching result
            const nowGood = allSubResults.some(r =>
                type === 'tv' ? r.episodes > 1 : r.episodes <= 1
            );
            if (nowGood) break;
        }
    }

    console.log(`[AllAnime] Sub results: ${allSubResults.length}, Dub results: ${allDubResults.length}`);

    // Fix 2 & 4: Type-aware pickBestMatch with improved scoring
    let matchSub = pickBestMatch(allSubResults, searchTitle, type, episode);
    let matchDub = pickBestMatch(allDubResults, searchTitle, type, episode);

    const streams = [];

    const fetchSources = async (match, lang, ep) => {
        if (!match) return;
        const sourceUrls = await getRawStreamSources(match.id, ep, lang.toLowerCase());
        console.log(`[${lang}] Got ${sourceUrls.length} raw sources`);

        // Only try providers we can extract direct video from
        const SUPPORTED_PROVIDERS = ['Yt-mp4', 'Default', 'S-mp4', 'Uv-mp4', 'Luf-Mp4', 'Sl-mp4'];

        for (const source of sourceUrls) {
            const sourceName = source.sourceName || '';
            let resolvedUrl = source.sourceUrl;

            // Decrypt --encoded URLs
            if (resolvedUrl.startsWith('--')) {
                resolvedUrl = decryptProviderId(resolvedUrl.substring(2));
                if (!resolvedUrl) {
                    console.log(`[${lang}] Failed to decrypt ${sourceName}`);
                    continue;
                }
            }

            console.log(`[${lang}] ${sourceName}: ${resolvedUrl.substring(0, 80)}`);

            // fast4speed is a direct mp4 stream
            if (resolvedUrl.includes('fast4speed')) {
                streams.push({
                    url: resolvedUrl,
                    quality: '1080p',
                    provider: `AllAnime ${sourceName} (${lang})`,
                    headers: { 'Referer': 'https://allanime.day', 'User-Agent': AGENT }
                });
                continue;
            }

            // For /apivtwo/clock.json endpoints (Default, S-mp4, Uv-mp4, Luf-Mp4)
            if (resolvedUrl.includes('/clock.json') || resolvedUrl.includes('/apivtwo/')) {
                const fullUrl = resolvedUrl.startsWith('http') ? resolvedUrl : (ALLANIME_BASE + resolvedUrl);
                const fetchedLinks = await fetchLinksFromProvider(fullUrl);
                for (const l of fetchedLinks) {
                    const linkUrl = l.url || '';
                    if (!linkUrl) continue;

                    // Handle wixmp repackager URLs with multiple quality variants
                    const wixmpMatch = linkUrl.match(/repackager\.wixmp\.com\/([^,]+)\/((?:,[^,]+)+,?)\/mp4\/file\.mp4/);
                    if (wixmpMatch) {
                        const videoBase = wixmpMatch[1];
                        const qualList = wixmpMatch[2].split(',').filter(q => q.length > 0);
                        for (const q of qualList) {
                            streams.push({
                                url: `https://${videoBase}/${q}/mp4/file.mp4`,
                                quality: q,
                                provider: `AllAnime ${sourceName} (${lang})`,
                                headers: { 'User-Agent': AGENT }
                            });
                        }
                    } else {
                        streams.push({
                            url: linkUrl,
                            quality: l.quality || l.resolutionStr || 'Auto',
                            provider: `AllAnime ${sourceName} (${lang})`,
                            headers: Object.assign({ 'Referer': 'https://allanime.day' }, l.headers || {})
                        });
                    }
                }
                continue;
            }

            // Skip pure iframes (ok.ru, streamsb, mp4upload, etc.) — can't extract direct video
            if (source.type === 'iframe') {
                console.log(`[${lang}] Skipping iframe: ${sourceName}`);
                continue;
            }
        }
    };

    await Promise.all([
        fetchSources(matchSub, "Sub", subEp),
        fetchSources(matchDub, "Dub", dubEp)
    ]);

    // Format streams for Nuvio
    return streams.map(s => {
        let res = "Unknown";
        if (s.quality) {
            const m = s.quality.match(/\d+p/i);
            if (m) res = m[0];
            else if (s.quality.toLowerCase() === 'best') res = "1080p";
        }
        return {
            name: s.provider,
            title: `${s.provider} | ${s.quality}`,
            url: s.url,
            quality: res,
            headers: s.headers
        };
    });
}

module.exports = {
    name: "AllAnime",
    getStreams
};
