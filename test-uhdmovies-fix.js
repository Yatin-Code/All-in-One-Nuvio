// test-uhdmovies-fix.js — Performance test for UHDMovies provider
// Usage: node test-uhdmovies-fix.js
// Tests both movies and TV shows with latency measurement

const { getStreams } = require('./providers/uhdmovies.js');

const TESTS = [
  {
    label: "Movie: Oppenheimer (2023)",
    tmdbId: { title: "Oppenheimer", year: "2023" },
    mediaType: "movie",
    season: null,
    episode: null
  },
  {
    label: "TV Show: Spider-Noir S01E01",
    tmdbId: { title: "Spider-Noir", year: "2025" },
    mediaType: "series",
    season: 1,
    episode: 1
  }
];

function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

async function runTest(test) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: ' + test.label);
  console.log('='.repeat(60));

  const startTime = Date.now();
  try {
    const streams = await getStreams(test.tmdbId, test.mediaType, test.season, test.episode);
    const elapsed = Date.now() - startTime;

    console.log('\n--- RESULTS ---');
    console.log('Streams found: ' + streams.length);
    console.log('Time taken:    ' + formatDuration(elapsed));

    if (streams.length === 0) {
      console.log('⚠️  No streams returned');
    } else {
      // Show first 5 streams
      const showCount = Math.min(streams.length, 5);
      console.log('\nTop ' + showCount + ' streams:');
      for (let i = 0; i < showCount; i++) {
        const s = streams[i];
        console.log('  [' + (i + 1) + '] ' + (s.title || s.name));
        console.log('      Quality: ' + (s.quality || 'Unknown'));
        console.log('      URL:     ' + (s.url ? s.url.substring(0, 80) + '...' : 'N/A'));
      }
    }

    // Performance assessment
    console.log('\n--- PERFORMANCE ---');
    if (elapsed < 5000) {
      console.log('✅ FAST (' + formatDuration(elapsed) + ')');
    } else if (elapsed < 15000) {
      console.log('⚠️  MODERATE (' + formatDuration(elapsed) + ')');
    } else {
      console.log('❌ SLOW (' + formatDuration(elapsed) + ') — needs optimization');
    }

    return { label: test.label, streams: streams.length, elapsed };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error('❌ ERROR after ' + formatDuration(elapsed) + ': ' + err.message);
    return { label: test.label, streams: 0, elapsed, error: err.message };
  }
}

async function main() {
  console.log('UHDMovies Provider Performance Test');
  console.log('Started at: ' + new Date().toISOString());
  console.log('Node version: ' + process.version);

  const totalStart = Date.now();
  const results = [];

  for (const test of TESTS) {
    results.push(await runTest(test));
  }

  const totalElapsed = Date.now() - totalStart;

  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('');

  const maxLabelLen = Math.max(...results.map(r => r.label.length));
  for (const r of results) {
    const status = r.error ? '❌' : (r.streams > 0 ? '✅' : '⚠️');
    const padding = ' '.repeat(maxLabelLen - r.label.length);
    console.log(status + ' ' + r.label + padding + '  →  ' + r.streams + ' streams in ' + formatDuration(r.elapsed));
  }

  console.log('');
  console.log('Total time: ' + formatDuration(totalElapsed));
  console.log('Average per test: ' + formatDuration(Math.round(totalElapsed / results.length)));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
