import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { GithubAppController } from './github-app.controller';

describe('GithubAppController security metadata', () => {
  it('requires admin role for connectOrganization', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, GithubAppController.prototype.connectOrganization);
    expect(roles).toEqual(['admin']);
  });

  it('requires admin role for triggerSync', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, GithubAppController.prototype.triggerSync);
    expect(roles).toEqual(['admin']);
  });
});
