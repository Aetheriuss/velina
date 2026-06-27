import 'regenerator-runtime/runtime'
// Enzyme removed in the React 18 upgrade (Phase 6): enzyme has no React-18 adapter and the only
// test (proxy SSRF) does not render components. If component tests are added later, use React
// Testing Library, which supports React 18.
