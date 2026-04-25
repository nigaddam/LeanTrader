export const CONNECTORS = [
  {
    id: 'kraken',
    name: 'Kraken',
    group: 'Trading',
    type: 'trading',
    description: 'Connect Kraken to prepare paper or live crypto trading workflows.',
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    group: 'Trading',
    type: 'trading',
    description: 'Connect Coinbase for future trading and account data support.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    group: 'AI / Agents',
    type: 'ai',
    description: 'Use OpenAI as the research and strategy-generation provider.',
  },
  {
    id: 'custom-api',
    name: 'Custom API',
    group: 'AI / Agents',
    type: 'custom-ai',
    description: 'Plug in your own AI agent endpoint for strategy research.',
  },
]

export const findConnector = (id) => CONNECTORS.find(connector => connector.id === id) || CONNECTORS[0]
