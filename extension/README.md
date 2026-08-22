# Apply AI Agent (Manifest V3 Extension)

The production Apply AI agent and browser extension logic resides in `application-auto-agent/`.

### Unified Project Commands

From the project root (`ai-career-platform/`):

- **Build Agent Extension**: `npm run agent:build`
- **Run Agent Unit Tests**: `npm run agent:test`
- **Watch Agent Changes**: `npm run agent:watch`
- **Build Full Stack (Next.js + Agent)**: `npm run build:all`

The compiled extension bundle will be output to: `application-auto-agent/dist/`. Load that unpacked directory in `chrome://extensions`.

