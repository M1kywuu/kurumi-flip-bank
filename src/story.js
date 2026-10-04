import history from './fx-history.json' with { type: 'json' };

export const MARKET_COLORS = Object.freeze({ up: '#ff536d', down: '#3de3a0' });
// One closed, simulated price tape. Printed pages advance five candles each;
// both the visible history and the unseen new opens stay continuous at the seam.
export const MARKET_SPEC = Object.freeze({ pages: 24, advance: 5, window: 31, entry: 155.4, displayScale: 500 });
const wrap = (i, n) => ((i % n) + n) % n;
function randomSource(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(values, random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function gaussian(random) {
  return Math.max(-2.3, Math.min(2.3, Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random())));
}
export function createMarketTimeline(seed = 0x4B555255) {
  const random = randomSource(seed), { pages, advance, entry, displayScale } = MARKET_SPEC;
  const outcomes = [8,17,27,34,39,48,54,61,74,86,111,136,-12,-21,-29,-37,-44,-52,-62,-73,-89,-106,-143,-177];
  let values;
  for (let attempt = 0; attempt < 10000; attempt++) {
    const candidate = shuffle(outcomes, random);
    if (candidate.every((v, i) => !(Math.sign(v) === Math.sign(candidate[(i+1)%pages]) && Math.sign(v) === Math.sign(candidate[(i+2)%pages])))) { values = candidate; break; }
  }
  if (!values) throw new Error('模拟行情没有排好。');
  const startAt = values.indexOf(34);
  values = [...values.slice(startAt), ...values.slice(0, startAt)];
  const anchors = values.map(value => entry * (1 + value / (100 * displayScale)));
  const bars = new Array(pages * advance);
  let volatility = .8;
  for (let segment = 0; segment < pages; segment++) {
    const from = anchors[segment], to = anchors[(segment + 1) % pages], delta = to - from;
    volatility = volatility * .82 + (.55 + random() * .9) * .18;
    const noise = Array.from({ length: advance }, () => gaussian(random));
    const noiseSum = noise.reduce((a, b) => a + b, 0);
    const sigma = Math.max(.018, Math.abs(delta) * .22) * volatility;
    let previous = from, partialNoise = 0;
    for (let k = 1; k <= advance; k++) {
      partialNoise += noise[k-1];
      const t = k / advance;
      const close = k === advance ? to : from + delta * t + sigma * (partialNoise - t * noiseSum);
      // Only wick proportions are sampled from the old historical reference;
      // every current price, open, and outcome belongs to this fictional tape.
      const shape = history.bars[Math.floor(random() * history.bars.length)];
      const range = Math.max(.00001, shape.high - shape.low);
      const upper = (shape.high - Math.max(shape.open, shape.close)) / range;
      const lower = (Math.min(shape.open, shape.close) - shape.low) / range;
      const localRange = Math.abs(close - previous) + .025 * volatility + sigma * .35;
      const high = Math.max(previous, close) + .001 + (upper + random() * .12) * localRange;
      const low = Math.min(previous, close) - .001 - (lower + random() * .12) * localRange;
      const index = (segment * advance + k) % bars.length;
      bars[index] = { time: index, open: previous, high, low, close };
      previous = close;
    }
  }
  const lows = bars.map(b => b.low), highs = bars.map(b => b.high);
  const padding = (Math.max(...highs) - Math.min(...lows)) * .07;
  const domain = Object.freeze({ min: Math.min(...lows) - padding, max: Math.max(...highs) + padding });
  return { bars, domain, values, seed };
}
export const SIMULATED_MARKET = createMarketTimeline();

export function characterMood(value) {
  if (value >= 95) return 3;
  if (value >= 65) return 2;
  if (value >= 25) return 1;
  if (value >= 0) return 0;
  if (value >= -30) return 4;
  if (value >= -75) return 5;
  if (value >= -120) return 6;
  return 7;
}
export function shouldLiquidate(value) {
  return Number.isFinite(value) && Math.round(value) <= -100;
}
export function characterLine(value, { peeking = false, coins = 0, finished = false, liquidated = false } = {}) {
  if (peeking && liquidated) return '……真的一枚都没了。';
  if (peeking && coins) return value < 0 ? '还好，硬币一枚没少。' : '这些才是真正存下来的！';
  if (value >= 95) return '我是不是很有天赋？';
  if (value >= 65) return '看吧，我就知道会涨！';
  if (value >= 25) return finished ? '就说能赚回来嘛！' : '再涨一点，就一点。';
  if (value >= 0) return '这次，一定赚回来。';
  if (value >= -30) return '没事。只是回调。';
  if (value >= -75) return '诶？刚刚还在涨啊？';
  if (value >= -120) return '不、不会吧……';
  return '等一下！等一下！！';
}

export const DEFAULT_STORY = Object.freeze({
  id: 'kurumi', name: '久留美的小金库', artwork: './assets/kurumi-expressions-v2.png',
  atlas: { columns: 4, rows: 2 }, marketSource: { type: 'simulation', ...MARKET_SPEC, seed: SIMULATED_MARKET.seed },
  // Preserve the printed tape; losing pages receive twice the stopping weight.
  stopWeights: Object.freeze(SIMULATED_MARKET.values.map(value => value < 0 ? 2 : 1)),
  pages: Array.from({ length: MARKET_SPEC.pages }, (_, i) => {
    const endpoint = i * MARKET_SPEC.advance, { bars, domain } = SIMULATED_MARKET;
    const price = bars[endpoint].close;
    const value = Math.round((price / MARKET_SPEC.entry - 1) * 100 * MARKET_SPEC.displayScale);
    return { value, expression: characterMood(value), note: characterLine(value, { finished: true }),
      candles: Array.from({ length: MARKET_SPEC.window }, (_, j) => bars[wrap(endpoint - MARKET_SPEC.window + 1 + j, bars.length)]),
      domain, price, date: '', pair: 'USD/JPY', interval: '模拟', xLabels: ['−30', '现在'] };
  }),
});
