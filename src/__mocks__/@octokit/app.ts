// Manual mock for @octokit/app — ESM-only package that cannot be loaded by Jest/CommonJS
export const App = jest.fn().mockImplementation(() => ({
  getInstallationOctokit: jest.fn().mockResolvedValue({
    auth: jest.fn().mockResolvedValue({ token: 'mock-installation-token' }),
  }),
}));
