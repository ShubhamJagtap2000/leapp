import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { TeamService } from "./team-service";
import { constants } from "../models/constants";
import { SecretType } from "leapp-team-core/encryptable-dto/secret-type";
import { SessionType } from "../models/session-type";
import { LoggedException, LogLevel } from "./log-service";
import { IntegrationType } from "../models/integration-type";

describe("TeamService", () => {
  let sessionFactory: any;
  let namedProfileService: any;
  let sessionManagementService: any;
  let awsSsoIntegrationService: any;
  let azureIntegrationService: any;
  let idpUrlService: any;
  let keyChainService: any;
  let nativeService: any;
  let fileService: any;
  let workspaceService: any;
  let integrationFactory: any;
  let crypto: any;
  let behaviouralSubjectService: any;

  let teamService: any;

  const createTeamServiceInstance = () => {
    sessionFactory = {};
    namedProfileService = {};
    sessionManagementService = {};
    awsSsoIntegrationService = {};
    azureIntegrationService = {};
    idpUrlService = {};
    keyChainService = {};
    nativeService = {};
    fileService = {};
    workspaceService = {};
    integrationFactory = {};
    crypto = {};
    behaviouralSubjectService = {};
    nativeService = {
      os: {
        homedir: () => "",
      },
      machineId: "mocked-machine-id",
    };
    teamService = new TeamService(
      sessionFactory,
      namedProfileService,
      sessionManagementService,
      awsSsoIntegrationService,
      azureIntegrationService,
      idpUrlService,
      keyChainService,
      nativeService,
      fileService,
      crypto,
      workspaceService,
      integrationFactory,
      behaviouralSubjectService
    );
  };

  test("getTeamStatus, logged in", async () => {
    createTeamServiceInstance();
    teamService.teamSignedInUserKeychainKey = "mock-team-signed-in-key";
    teamService.keyChainService = {
      getSecret: jest.fn(() => `{"teamName": "mock-team-name", "email": "mock-email", "accessToken": "mock-token"}`),
    };
    const result = await teamService.getTeamStatus();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-team-signed-in-key");
    expect(result).toBe(`workspace: mock-team-name\nemail: mock-email\nstatus: online`);
  });

  test("getTeamStatus, logged in no access token", async () => {
    createTeamServiceInstance();
    teamService.teamSignedInUserKeychainKey = "mock-team-signed-in-key";
    teamService.keyChainService = {
      getSecret: jest.fn(() => `{"teamName": "mock-team-name", "email": "mock-email"}`),
    };
    const result = await teamService.getTeamStatus();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-team-signed-in-key");
    expect(result).toBe(`workspace: mock-team-name\nemail: mock-email\nstatus: offline`);
  });

  test("getTeamStatus, not logged in", async () => {
    createTeamServiceInstance();
    teamService.teamSignedInUserKeychainKey = "mock-team-signed-in-key";
    teamService.keyChainService = {
      getSecret: jest.fn(() => null),
    };
    const result = await teamService.getTeamStatus();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-team-signed-in-key");
    expect(result).toBe(`you're not logged in`);
  });

  test("setCurrentWorkspace, local or null workspace saved in keychain", async () => {
    createTeamServiceInstance();
    teamService.keyChainService = {
      getSecret: jest.fn(() => `{"mockKey": "mockValue"}`),
    };
    teamService._signedInUserState$ = {
      next: jest.fn(),
    };
    teamService.setLocalWorkspace = jest.fn();
    teamService.getKeychainCurrentWorkspace = jest.fn(() => "local");
    teamService.teamSignedInUserKeychainKey = "mock-team-signed-in-key";

    await teamService.setCurrentWorkspace();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-team-signed-in-key");
    expect(teamService._signedInUserState$.next).toHaveBeenCalledWith({ mockKey: "mockValue" });
    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.setLocalWorkspace).toHaveBeenCalled();
  });

  test("setCurrentWorkspace, remote workspace saved in keychain", async () => {
    createTeamServiceInstance();
    teamService.keyChainService = {
      getSecret: jest.fn(() => `{"mockKey": "mockValue"}`),
    };
    teamService._signedInUserState$ = {
      next: jest.fn(),
    };
    teamService.setLocalWorkspace = jest.fn();
    teamService.getKeychainCurrentWorkspace = jest.fn(() => "team-name");
    teamService.teamSignedInUserKeychainKey = "mock-team-signed-in-key";
    teamService.syncSecrets = jest.fn();

    await teamService.setCurrentWorkspace();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-team-signed-in-key");
    expect(teamService._signedInUserState$.next).toHaveBeenCalledWith({ mockKey: "mockValue" });
    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.setLocalWorkspace).not.toHaveBeenCalled();
    expect(teamService.syncSecrets).toHaveBeenCalled();
  });

  test("setCurrentWorkspace, error thrown during syncSecrets", async () => {
    createTeamServiceInstance();
    teamService.keyChainService = {
      getSecret: () => `{"mockKey": "mockValue"}`,
    };
    teamService._signedInUserState$ = {
      next: () => {},
    };
    teamService.setLocalWorkspace = () => {};
    teamService.getKeychainCurrentWorkspace = () => "team-name";
    teamService.teamSignedInUserKeychainKey = "mock-team-signed-in-key";
    teamService.syncSecrets = () => {
      throw new Error();
    };
    teamService.signOut = jest.fn();

    await teamService.setCurrentWorkspace();
    expect(teamService.signOut).toHaveBeenCalled();
  });

  test("setCurrentWorkspace, reloadOnly is set to true", async () => {
    createTeamServiceInstance();
    teamService.keyChainService = {
      getSecret: () => `{"mockKey": "mockValue"}`,
    };
    teamService._signedInUserState$ = {
      next: () => {},
    };
    teamService.getKeychainCurrentWorkspace = () => "team-name";
    teamService.syncSecrets = jest.fn();

    await teamService.setCurrentWorkspace(true);

    expect(teamService.syncSecrets).toHaveBeenCalledTimes(1);
    expect(teamService.syncSecrets).toHaveBeenCalledWith(true);
  });

  test("signIn()", async () => {
    createTeamServiceInstance();
    const signedInUser = "signed-user-mock";
    teamService.userProvider = {
      signIn: jest.fn(() => signedInUser),
    };
    teamService.setSignedInUser = jest.fn();

    await teamService.signIn("mock-email", "mock-password");
    expect(teamService.userProvider.signIn).toHaveBeenCalledWith("mock-email", "mock-password");
    expect(teamService.setSignedInUser).toHaveBeenCalledWith(signedInUser);
  });

  test("setSignedInUser() - adding the user to the keychain", async () => {
    createTeamServiceInstance();
    teamService.keyChainService = {
      saveSecret: jest.fn(),
      deleteSecret: jest.fn(),
    };
    teamService._signedInUserState$ = {
      next: jest.fn(),
    };
    const mockUser: any = {
      user: "mock-user",
    };
    await teamService.setSignedInUser(mockUser);
    expect(teamService.keyChainService.saveSecret).toHaveBeenCalledWith(constants.appName, "team-signed-in-user", JSON.stringify(mockUser));
    expect(teamService._signedInUserState$.next).toHaveBeenCalledWith(mockUser);
  });

  test("signOut, returns immediately if signedInUser is null", async () => {
    createTeamServiceInstance();
    teamService.getKeychainCurrentWorkspace = jest.fn();
    await teamService.signOut();
    expect(teamService.getKeychainCurrentWorkspace).not.toHaveBeenCalled();
  });

  test("signOut, a remote workspace is currently set", async () => {
    createTeamServiceInstance();
    teamService.getKeychainCurrentWorkspace = jest.fn(() => "remote-workspace-name");
    teamService._signedInUserState$ = {
      getValue: jest.fn(() => ({ teamId: "1" })),
      next: jest.fn(),
    } as any;
    workspaceService.extractGlobalSettings = jest.fn(() => "mocked-global-settings");
    teamService.getTeamLockFileName = jest.fn(() => "mock-value");
    teamService.teamSignedInUserKeychainKey = "mockTeamSignedInUserKeychainKey";
    workspaceService.setWorkspaceFileName = jest.fn();
    workspaceService.reloadWorkspace = jest.fn();
    teamService.deleteCurrentWorkspace = jest.fn();
    teamService.setLocalWorkspace = jest.fn();
    keyChainService.deleteSecret = jest.fn();

    await teamService.signOut();

    expect(teamService._signedInUserState$.getValue).toHaveBeenCalled();
    expect(teamService.getTeamLockFileName).toHaveBeenCalledWith("1");
    expect(workspaceService.setWorkspaceFileName).toHaveBeenCalledWith("mock-value");
    expect(workspaceService.reloadWorkspace).toHaveBeenCalled();
    expect(teamService.deleteCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.setLocalWorkspace).toHaveBeenCalledWith("mocked-global-settings");
    expect(keyChainService.deleteSecret).toHaveBeenCalledWith(constants.appName, "mockTeamSignedInUserKeychainKey");
    expect(teamService._signedInUserState$.next).toHaveBeenCalledWith(null);
  });

  test("signOut, a local workspace is currently set", async () => {
    createTeamServiceInstance();
    teamService.getKeychainCurrentWorkspace = jest.fn(() => "local");
    teamService._signedInUserState$ = {
      getValue: jest.fn(() => ({ teamId: "1" })),
      next: jest.fn(),
    } as any;
    teamService.getTeamLockFileName = jest.fn(() => {});
    teamService.teamSignedInUserKeychainKey = "mockTeamSignedInUserKeychainKey";
    workspaceService.setWorkspaceFileName = jest.fn();
    workspaceService.reloadWorkspace = jest.fn();
    teamService.deleteCurrentWorkspace = jest.fn();
    teamService.setLocalWorkspace = jest.fn();
    keyChainService.deleteSecret = jest.fn();

    await teamService.signOut();

    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalledTimes(1);
    expect(teamService.getTeamLockFileName).not.toHaveBeenCalledWith("mock-team-name");
    expect(workspaceService.setWorkspaceFileName).not.toHaveBeenCalledWith("mock-value");
    expect(workspaceService.reloadWorkspace).not.toHaveBeenCalled();
    expect(teamService.deleteCurrentWorkspace).not.toHaveBeenCalled();
    expect(teamService.setLocalWorkspace).not.toHaveBeenCalled();
    expect(keyChainService.deleteSecret).toHaveBeenCalledWith(constants.appName, "mockTeamSignedInUserKeychainKey");
    expect(teamService._signedInUserState$.next).toHaveBeenCalledWith(null);
  });

  test("signOut, if lock input is true", async () => {
    createTeamServiceInstance();
    teamService.getKeychainCurrentWorkspace = jest.fn(() => "local");
    teamService._signedInUserState$ = {
      getValue: jest.fn(() => ({
        teamId: "1",
        symmetricKey: "mocked-symmetric-key",
        privateRSAKey: "mocked-private-rsa-key",
        publicRSAKey: "mocked-public-rsa-key",
        accessToken: "mocked-access-token",
      })),
      next: jest.fn(),
    } as any;
    teamService.teamSignedInUserKeychainKey = "mockTeamSignedInUserKeychainKey";
    teamService.setSignedInUser = jest.fn();
    keyChainService.deleteSecret = jest.fn();

    await teamService.signOut(true);

    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalledTimes(1);
    expect(teamService.setSignedInUser).toHaveBeenCalledWith({
      teamId: "1",
      symmetricKey: "",
      privateRSAKey: "",
      publicRSAKey: "",
      accessToken: "",
    });
  });

  describe("TeamService.syncSecrets", () => {
    let signedInUser;
    let mockedLocalSecretDtos;
    beforeEach(() => {
      createTeamServiceInstance();
      mockedLocalSecretDtos = [];
      signedInUser = {
        accessToken: "access-token",
        publicRSAKey: "mock",
        teamName: "team-name",
      };
      teamService._signedInUserState$ = {
        getValue: jest.fn(() => signedInUser),
      };
      workspaceService.removeWorkspace = jest.fn();
      workspaceService.createWorkspace = jest.fn();
      workspaceService.reloadWorkspace = jest.fn();
      workspaceService.getWorkspace = jest.fn(() => ({ sessions: [] }));
      workspaceService.extractGlobalSettings = jest.fn(() => []);
      workspaceService.applyGlobalSettings = jest.fn(() => []);
      const mockedRsaKeys = {
        privateKey: "mocked-private-key",
      };
      teamService.loadAndDecryptWorkspace = jest.fn();
      teamService.getRSAKeys = jest.fn(() => ({ privateKey: mockedRsaKeys }));
      teamService.vaultProvider.getSecrets = jest.fn(() => mockedLocalSecretDtos);
      teamService.setKeychainCurrentWorkspace = jest.fn(async () => {});
      teamService.syncIntegrationSecret = jest.fn(async () => {});
      teamService.syncSessionsSecret = jest.fn(async () => {});
    });

    test("if user token is expired, return and signout", async () => {
      teamService.isJwtTokenExpired = jest.fn(() => true);
      teamService.signOut = jest.fn();
      await teamService.syncSecrets();
      expect(teamService.loadAndDecryptWorkspace).toHaveBeenCalled();
      expect(workspaceService.getWorkspace).toHaveBeenCalled();
      expect(workspaceService.extractGlobalSettings).toHaveBeenCalled();
      expect(teamService._signedInUserState$.getValue).toHaveBeenCalled();
      expect(teamService.isJwtTokenExpired).toHaveBeenCalledWith("access-token");
      expect(teamService.signOut).toHaveBeenCalled();
    });

    test("if user is not signed in, return and signout", async () => {
      signedInUser = null;
      teamService.isJwtTokenExpired = jest.fn();
      teamService.signOut = jest.fn();

      await teamService.syncSecrets();

      expect(teamService.loadAndDecryptWorkspace).toHaveBeenCalled();
      expect(workspaceService.getWorkspace).toHaveBeenCalled();
      expect(workspaceService.extractGlobalSettings).toHaveBeenCalled();
      expect(teamService._signedInUserState$.getValue).toHaveBeenCalled();
      expect(teamService.isJwtTokenExpired).not.toHaveBeenCalled();
      expect(teamService.signOut).toHaveBeenCalled();
    });

    test("user signed in, no localSecretDtos", async () => {
      signedInUser = {
        teamName: "team-name",
        accessToken: "access-token",
      };
      teamService.isJwtTokenExpired = jest.fn(() => false);
      teamService.setKeychainCurrentWorkspace = jest.fn();
      teamService.refreshWorkspaceState = jest.fn((callback: () => Promise<void>) => {
        callback();
      });

      await teamService.syncSecrets();

      expect(teamService.loadAndDecryptWorkspace).toHaveBeenCalled();
      expect(workspaceService.getWorkspace).toHaveBeenCalled();
      expect(workspaceService.extractGlobalSettings).toHaveBeenCalled();
      expect(teamService._signedInUserState$.getValue).toHaveBeenCalled();
      expect(teamService.isJwtTokenExpired).toHaveBeenCalledWith("access-token");
      expect(teamService.setKeychainCurrentWorkspace).toHaveBeenCalledWith(signedInUser.teamName);
      expect(teamService.refreshWorkspaceState).toHaveBeenCalledTimes(1);
      expect(workspaceService.removeWorkspace).toHaveBeenCalledTimes(1);
      expect(workspaceService.createWorkspace).toHaveBeenCalledTimes(1);
      expect(workspaceService.reloadWorkspace).toHaveBeenCalledTimes(1);
      expect(teamService.getRSAKeys).toHaveBeenCalledWith(signedInUser);
    });

    test("if the returned localSecretDto array contains an integration, expect syncIntegrationSecret to have been called once passing the expected integration dto", async () => {
      signedInUser = {
        teamName: "team-name",
        accessToken: "access-token",
      };
      teamService.isJwtTokenExpired = jest.fn(() => false);

      const awsIntegration = { secretType: SecretType.awsSsoIntegration };
      const azureIntegration = { secretType: SecretType.azureIntegration };
      const session = { secretType: SecretType.awsIamUserSession };
      mockedLocalSecretDtos = [awsIntegration, azureIntegration, session];
      teamService.syncIntegrationSecret = jest.fn();
      teamService.syncSessionsSecret = jest.fn();
      teamService.refreshWorkspaceState = jest.fn(async (callback: () => Promise<void>) => {
        await callback();
      });

      await teamService.syncSecrets();

      expect(teamService.loadAndDecryptWorkspace).toHaveBeenCalled();
      expect(workspaceService.getWorkspace).toHaveBeenCalled();
      expect(workspaceService.extractGlobalSettings).toHaveBeenCalled();
      expect(teamService._signedInUserState$.getValue).toHaveBeenCalled();
      expect(teamService.isJwtTokenExpired).toHaveBeenCalledWith("access-token");
      expect(teamService.setKeychainCurrentWorkspace).toHaveBeenCalledWith(signedInUser.teamName);
      expect(teamService.refreshWorkspaceState).toHaveBeenCalledTimes(1);
      expect(workspaceService.removeWorkspace).toHaveBeenCalledTimes(1);
      expect(workspaceService.createWorkspace).toHaveBeenCalledTimes(1);
      expect(workspaceService.reloadWorkspace).toHaveBeenCalledTimes(1);
      expect(teamService.getRSAKeys).toHaveBeenCalledWith(signedInUser);
      expect(teamService.syncIntegrationSecret).toHaveBeenNthCalledWith(1, awsIntegration);
      expect(teamService.syncIntegrationSecret).toHaveBeenNthCalledWith(2, azureIntegration);
      expect(teamService.syncSessionsSecret).toHaveBeenNthCalledWith(1, session);
    });

    test("if readOnly is set to true", async () => {
      signedInUser = {
        teamName: "team-name",
        accessToken: "access-token",
      };
      teamService.isJwtTokenExpired = jest.fn(() => false);

      const awsIntegration = { secretType: SecretType.awsSsoIntegration };
      const azureIntegration = { secretType: SecretType.azureIntegration };
      const session = { secretType: SecretType.awsIamUserSession };
      mockedLocalSecretDtos = [awsIntegration, azureIntegration, session];
      teamService.syncIntegrationSecret = jest.fn();
      teamService.syncSessionsSecret = jest.fn();
      teamService.refreshWorkspaceState = jest.fn(async (callback: () => Promise<void>) => {
        await callback();
      });

      await teamService.syncSecrets(true);

      expect(teamService.loadAndDecryptWorkspace).toHaveBeenCalled();
      expect(workspaceService.getWorkspace).toHaveBeenCalled();
      expect(workspaceService.extractGlobalSettings).toHaveBeenCalled();
      expect(teamService._signedInUserState$.getValue).toHaveBeenCalled();
      expect(teamService.isJwtTokenExpired).toHaveBeenCalledWith("access-token");
      expect(teamService.setKeychainCurrentWorkspace).toHaveBeenCalledWith(signedInUser.teamName);
      expect(teamService.refreshWorkspaceState).toHaveBeenCalledTimes(1);
      expect(workspaceService.removeWorkspace).not.toHaveBeenCalled();
      expect(workspaceService.reloadWorkspace).toHaveBeenCalledTimes(1);
    });
  });

  test("deleteTeamWorkspace, local workspace is the current one", async () => {
    createTeamServiceInstance();
    teamService.getKeychainCurrentWorkspace = jest.fn(async () => "local");
    teamService.deleteCurrentWorkspace = jest.fn();

    await teamService.deleteTeamWorkspace();
    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.deleteCurrentWorkspace).not.toHaveBeenCalled();
  });

  test("deleteTeamWorkspace, remote workspace is the current one", async () => {
    createTeamServiceInstance();
    teamService.getKeychainCurrentWorkspace = jest.fn(async () => "remote-workspace");
    teamService.deleteCurrentWorkspace = jest.fn();

    await teamService.deleteTeamWorkspace();
    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.deleteCurrentWorkspace).toHaveBeenCalled();
  });

  test("switchToLocalWorkspace", async () => {
    createTeamServiceInstance();
    teamService.deleteTeamWorkspace = jest.fn();
    teamService.setLocalWorkspace = jest.fn();
    workspaceService.extractGlobalSettings = jest.fn(() => "mocked-global-settings");

    await teamService.switchToLocalWorkspace();
    expect(teamService.deleteTeamWorkspace).toHaveBeenCalled();
    expect(teamService.setLocalWorkspace).toHaveBeenCalledWith("mocked-global-settings");
  });

  test("refreshWorkspaceState, local workspace", async () => {
    createTeamServiceInstance();
    const workspaceKeychainSecret = `{"publicRSAKey":"mock-rsa-key","teamId":"mock-id","teamName":"mock-name"}`;
    teamService.teamSignedInUserKeychainKey = "mock-keychain";
    teamService.getKeychainCurrentWorkspace = jest.fn(() => {
      expect(teamService.switchingWorkspaceState.next).toHaveBeenCalledTimes(1);
      expect(teamService.switchingWorkspaceState.next).toHaveBeenCalledWith(true);
      return "local";
    });
    teamService.loadAndDecryptWorkspace = jest.fn();
    teamService.keyChainService = {
      getSecret: jest.fn(() => workspaceKeychainSecret),
    };
    teamService.signedInUserState.next = jest.fn();
    teamService.workspaceState.next = jest.fn();
    teamService.switchingWorkspaceState.next = jest.fn();
    teamService.behaviouralSubjectService.reloadSessionsAndIntegrationsFromRepository = jest.fn();

    await teamService.refreshWorkspaceState();

    expect(teamService.loadAndDecryptWorkspace.mock.calls[0].length).toBe(0);
    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-keychain");
    expect(teamService.signedInUserState.next).toHaveBeenCalledWith(JSON.parse(workspaceKeychainSecret));
    expect(teamService.workspaceState.next).toHaveBeenCalledWith({ name: constants.localWorkspaceName, id: constants.localWorkspaceKeychainValue });
    expect(teamService.behaviouralSubjectService.reloadSessionsAndIntegrationsFromRepository).toHaveBeenCalled();
    expect(teamService.switchingWorkspaceState.next).toHaveBeenCalledTimes(2);
    expect(teamService.switchingWorkspaceState.next).toHaveBeenNthCalledWith(2, false);
  });

  test("refreshWorkspaceState, switchingWorkspaceState set to false even with errors", async () => {
    createTeamServiceInstance();
    teamService.switchingWorkspaceState.next = jest.fn();
    teamService.getKeychainCurrentWorkspace = jest.fn(() => {
      throw new Error("some error");
    });

    try {
      await teamService.refreshWorkspaceState();
    } catch (error: any) {}

    expect(teamService.switchingWorkspaceState.next).toHaveBeenCalledTimes(2);
    expect(teamService.switchingWorkspaceState.next).toHaveBeenNthCalledWith(2, false);
  });

  test("refreshWorkspaceState, remote workspace", async () => {
    createTeamServiceInstance();
    const workspaceKeychainSecret = `{"publicRSAKey":"mock-rsa-key","teamId":"mock-id","teamName":"mock-name"}`;
    teamService.teamSignedInUserKeychainKey = "mock-keychain";
    teamService.getKeychainCurrentWorkspace = jest.fn(() => "remote-workspace");
    teamService.loadAndDecryptWorkspace = jest.fn();
    teamService.keyChainService = {
      getSecret: jest.fn(() => workspaceKeychainSecret),
    };
    teamService.getTeamLockFileName = jest.fn(() => "team-lock-file-name");
    teamService.signedInUserState.next = jest.fn();
    teamService.workspaceState.next = jest.fn();
    teamService.behaviouralSubjectService.reloadSessionsAndIntegrationsFromRepository = jest.fn();
    const mockCallback = jest.fn();
    await teamService.refreshWorkspaceState(mockCallback);

    expect(mockCallback).toHaveBeenCalled();
    expect(teamService.loadAndDecryptWorkspace).toHaveBeenCalledWith(
      JSON.parse(`{"publicRSAKey":"mock-rsa-key","teamId":"mock-id","teamName":"mock-name"}`)
    );
    expect(teamService.getKeychainCurrentWorkspace).toHaveBeenCalled();
    expect(teamService.keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "mock-keychain");
    expect(teamService.signedInUserState.next).toHaveBeenCalledWith(JSON.parse(workspaceKeychainSecret));
    expect(teamService.workspaceState.next).toHaveBeenCalledWith({ name: "mock-name", id: "mock-id" });
    expect(teamService.behaviouralSubjectService.reloadSessionsAndIntegrationsFromRepository).toHaveBeenCalled();
  });

  test("getKeychainCurrentWorkspace", async () => {
    createTeamServiceInstance();
    keyChainService.getSecret = jest.fn(async () => "mock-name");

    const result = await teamService.getKeychainCurrentWorkspace();
    expect(keyChainService.getSecret).toHaveBeenCalledWith(constants.appName, "current-workspace");
    expect(result).toBe("mock-name");
  });

  test("setKeychainCurrentWorkspace", async () => {
    createTeamServiceInstance();
    keyChainService.saveSecret = jest.fn();

    await teamService.setKeychainCurrentWorkspace("mock-name");
    expect(keyChainService.saveSecret).toHaveBeenCalledWith(constants.appName, "current-workspace", "mock-name");
  });

  test("setLocalWorkspace", async () => {
    createTeamServiceInstance();
    teamService.setKeychainCurrentWorkspace = jest.fn();
    teamService.refreshWorkspaceState = jest.fn();

    await teamService.setLocalWorkspace();

    expect(teamService.setKeychainCurrentWorkspace).toHaveBeenCalledWith("local");
    expect(teamService.refreshWorkspaceState).toHaveBeenCalledTimes(1);
  });

  test("setLocalWorkspace, with global settings", async () => {
    createTeamServiceInstance();
    teamService.setKeychainCurrentWorkspace = jest.fn();
    teamService.refreshWorkspaceState = jest.fn();
    (teamService as any).loadAndDecryptWorkspace = jest.fn();
    workspaceService.applyGlobalSettings = jest.fn();

    await teamService.setLocalWorkspace("mocked-global-settings");

    expect(teamService.setKeychainCurrentWorkspace).toHaveBeenCalledWith("local");
    expect((teamService as any).loadAndDecryptWorkspace).toHaveBeenCalled();
    expect(workspaceService.applyGlobalSettings).toHaveBeenCalledWith("mocked-global-settings");
    expect(teamService.refreshWorkspaceState).toHaveBeenCalledTimes(1);
  });

  test("deleteCurrentWorkspace", async () => {
    createTeamServiceInstance();
    const awsSsoIntegration = { id: "mocked-id-1", type: IntegrationType.awsSso };
    const azureIntegration = { id: "mocked-id-2", type: IntegrationType.azure };
    const federatedSession = { sessionId: "mocked-id-3", type: SessionType.awsIamRoleFederated };
    const workspace = { awsSsoIntegrations: [awsSsoIntegration], azureIntegrations: [azureIntegration], sessions: [federatedSession] };
    awsSsoIntegrationService = {
      logout: jest.fn(),
    };
    azureIntegrationService = {
      logout: jest.fn(),
    };
    const federatedSessionService = {
      delete: jest.fn((sessionId) => {
        workspace.sessions = workspace.sessions.filter((session) => session.sessionId !== sessionId);
      }),
    };

    integrationFactory.getIntegrationService = jest.fn((integrationType: IntegrationType) => {
      if (integrationType === IntegrationType.awsSso) {
        return awsSsoIntegrationService;
      } else if (integrationType === IntegrationType.azure) {
        return azureIntegrationService;
      }
    });
    sessionFactory.getSessionService = jest.fn(() => federatedSessionService);
    workspaceService.getWorkspace = jest.fn(() => workspace);
    workspaceService.removeWorkspace = jest.fn();

    await teamService.deleteCurrentWorkspace();

    expect(workspaceService.getWorkspace).toHaveBeenCalled();
    expect(integrationFactory.getIntegrationService).toHaveBeenNthCalledWith(1, IntegrationType.awsSso);
    expect(integrationFactory.getIntegrationService).toHaveBeenNthCalledWith(2, IntegrationType.azure);
    expect(awsSsoIntegrationService.logout).toHaveBeenCalledWith(awsSsoIntegration.id);
    expect(azureIntegrationService.logout).toHaveBeenCalledWith(azureIntegration.id);

    expect(sessionFactory.getSessionService).toHaveBeenNthCalledWith(1, SessionType.awsIamRoleFederated);
    expect(federatedSessionService.delete).toHaveBeenNthCalledWith(1, federatedSession.sessionId);
    expect(workspaceService.removeWorkspace).toHaveBeenCalled();
  });

  describe("TeamService.syncIntegrationSecret", () => {
    beforeEach(() => {
      createTeamServiceInstance();
      teamService.awsSsoIntegrationService = {
        getIntegration: jest.fn(() => ({ id: "aws-sso-id" })),
        deleteIntegration: jest.fn(async () => {}),
        createIntegration: jest.fn(async () => {}),
      };
      teamService.azureIntegrationService = {
        getIntegration: jest.fn(() => ({ id: "azure-sso-id" })),
        deleteIntegration: jest.fn(async () => {}),
        createIntegration: jest.fn(async () => {}),
      };
    });

    test("sync an aws sso integration", async () => {
      const awsSsomockDto = {
        secretType: SecretType.awsSsoIntegration,
        id: "mock-id",
        alias: "mock-alias",
        portalUrl: "mock-portal-url",
        region: "mock-region",
        browserOpening: "mock-browser-opening",
      };

      await teamService.syncIntegrationSecret(awsSsomockDto);
      expect(teamService.awsSsoIntegrationService.getIntegration).toHaveBeenCalledWith("mock-id");
      expect(teamService.awsSsoIntegrationService.deleteIntegration).toHaveBeenCalledWith("aws-sso-id");
      expect(teamService.awsSsoIntegrationService.createIntegration).toHaveBeenCalledWith(
        {
          alias: awsSsomockDto.alias,
          portalUrl: awsSsomockDto.portalUrl,
          region: awsSsomockDto.region,
          browserOpening: awsSsomockDto.browserOpening,
        },
        "mock-id"
      );
    });

    test("sync an azure integration", async () => {
      const azureMockDto = {
        secretType: SecretType.azureIntegration,
        id: "mock-id",
        alias: "mock-alias",
        tenantId: "mock-tenant-id",
        region: "mock-region",
      };

      await teamService.syncIntegrationSecret(azureMockDto);
      expect(teamService.azureIntegrationService.getIntegration).toHaveBeenCalledWith("mock-id");
      expect(teamService.azureIntegrationService.deleteIntegration).toHaveBeenCalledWith("azure-sso-id");
      expect(teamService.azureIntegrationService.createIntegration).toHaveBeenCalledWith(
        {
          alias: azureMockDto.alias,
          tenantId: azureMockDto.tenantId,
          region: azureMockDto.region,
        },
        "mock-id"
      );
    });
  });

  describe("TeamService.syncSessionsSecret", () => {
    beforeEach(() => {
      createTeamServiceInstance();
    });

    test("if the input secret is an aws iam user session, sessionFactory.getSessionService is called with aws iam user session type and sessionService.create is called with the expected AwsIamUserSessionRequest", async () => {
      const mockedProfileId = "mocked-profile-id";
      const localSecret = {
        secretType: SecretType.awsIamUserSession,
        sessionId: "mocked-session-id",
        profileName: "mocked-profile-name",
        sessionName: "mocked-session-name",
        accessKey: "mocked-access-key",
        secretKey: "mocked-secret-key",
        region: "mocked-region",
        mfaDevice: "mocked-mfa-device",
        profileId: mockedProfileId,
      };
      const mockedSessionService = {
        create: jest.fn(),
      };
      teamService.sessionFactory.getSessionService = jest.fn(() => mockedSessionService);
      teamService.setupAwsSession = jest.fn(() => mockedProfileId);

      await teamService.syncSessionsSecret(localSecret);

      expect(teamService.sessionFactory.getSessionService).toHaveBeenCalledTimes(1);
      expect(teamService.sessionFactory.getSessionService).toHaveBeenCalledWith(SessionType.awsIamUser);
      expect(teamService.setupAwsSession).toHaveBeenCalledTimes(1);
      expect(teamService.setupAwsSession).toHaveBeenCalledWith(mockedSessionService, localSecret.sessionId, localSecret.profileName);
      expect(mockedSessionService.create).toHaveBeenCalledTimes(1);
      expect(mockedSessionService.create).toHaveBeenCalledWith({
        sessionName: localSecret.sessionName,
        accessKey: localSecret.accessKey,
        secretKey: localSecret.secretKey,
        region: localSecret.region,
        mfaDevice: localSecret.mfaDevice,
        profileId: mockedProfileId,
        sessionId: localSecret.sessionId,
      });
    });

    test("if the input secret is an aws iam role chained session, sessionFactory.getSessionService is called with aws iam role chained session type and sessionService.create is called with the expected AwsIamRoleChainedSessionRequest", async () => {
      const mockedProfileId = "mocked-profile-id";
      const mockedParentSessionId = "mocked-parent-session-id";
      const localSecret = {
        secretType: SecretType.awsIamRoleChainedSession,
        sessionId: "mocked-session-id",
        sessionName: "mocked-session-name",
        region: "mocked-region",
        roleArn: "mocked-role-arn",
        profileName: "mocked-profile-name",
        parentSessionId: mockedParentSessionId,
        roleSessionName: "mocked-role-session-name",
      };
      const mockedSessionService = {
        create: jest.fn(),
      };
      teamService.sessionFactory.getSessionService = jest.fn(() => mockedSessionService);
      teamService.setupAwsSession = jest.fn(() => mockedProfileId);
      teamService.getAssumerSessionId = jest.fn(() => mockedParentSessionId);
      (teamService as any).isOrphanedChainedSession = jest.fn(() => false);

      await teamService.syncSessionsSecret(localSecret);

      expect(teamService.sessionFactory.getSessionService).toHaveBeenCalledTimes(1);
      expect(teamService.sessionFactory.getSessionService).toHaveBeenCalledWith(SessionType.awsIamRoleChained);
      expect(teamService.setupAwsSession).toHaveBeenCalledTimes(1);
      expect(teamService.setupAwsSession).toHaveBeenCalledWith(mockedSessionService, localSecret.sessionId, localSecret.profileName);
      expect((teamService as any).isOrphanedChainedSession).toHaveBeenCalledWith(localSecret);
      expect(mockedSessionService.create).toHaveBeenCalledTimes(1);
      expect(mockedSessionService.create).toHaveBeenCalledWith({
        sessionName: localSecret.sessionName,
        region: localSecret.region,
        roleArn: localSecret.roleArn,
        profileId: mockedProfileId,
        parentSessionId: mockedParentSessionId,
        roleSessionName: localSecret.roleSessionName,
        sessionId: localSecret.sessionId,
      });
    });

    test("if the input secret is an aws iam role chained orphaned session, the session is skipped", async () => {
      const localSecret = {
        secretType: SecretType.awsIamRoleChainedSession,
      } as any;
      (teamService as any).isOrphanedChainedSession = jest.fn(() => true);
      teamService.sessionFactory.getSessionService = jest.fn();

      await teamService.syncSessionsSecret(localSecret);

      expect(teamService.sessionFactory.getSessionService).not.toHaveBeenCalled();
    });

    test("if the input secret is an aws iam role federated session, sessionFactory.getSessionService is called with aws iam role federated session type and sessionService.create is called with the expected AwsIamRoleFedetatedSessionRequest", async () => {
      const mockedProfileId = "mocked-profile-id";
      const mockedParentSessionId = "mocked-parent-session-id";
      const localSecret = {
        secretType: SecretType.awsIamRoleFederatedSession,
        sessionId: "mocked-session-id",
        sessionName: "mocked-session-name",
        region: "mocked-region",
        roleArn: "mocked-role-arn",
        samlUrl: "mocked-saml-url",
        idpArn: "mocked-idp-arn",
        profileName: "mocked-profile-name",
      };
      const mockedSessionService = {
        create: jest.fn(),
      };
      teamService.sessionFactory.getSessionService = jest.fn(() => mockedSessionService);
      teamService.setupAwsSession = jest.fn(() => mockedProfileId);
      teamService.getAssumerSessionId = jest.fn(() => mockedParentSessionId);
      const mockedIdpUrl = "mocked-idp-url";
      idpUrlService.mergeIdpUrl = jest.fn(() => ({ id: mockedIdpUrl }));

      await teamService.syncSessionsSecret(localSecret);

      expect(teamService.sessionFactory.getSessionService).toHaveBeenCalledTimes(1);
      expect(teamService.sessionFactory.getSessionService).toHaveBeenCalledWith(SessionType.awsIamRoleFederated);
      expect(teamService.setupAwsSession).toHaveBeenCalledTimes(1);
      expect(teamService.setupAwsSession).toHaveBeenCalledWith(mockedSessionService, localSecret.sessionId, localSecret.profileName);
      expect(idpUrlService.mergeIdpUrl).toHaveBeenCalledTimes(1);
      expect(idpUrlService.mergeIdpUrl).toHaveBeenCalledWith(localSecret.samlUrl);
      expect(mockedSessionService.create).toHaveBeenCalledTimes(1);
      expect(mockedSessionService.create).toHaveBeenCalledWith({
        sessionName: localSecret.sessionName,
        region: localSecret.region,
        roleArn: localSecret.roleArn,
        profileId: mockedProfileId,
        idpUrl: mockedIdpUrl,
        idpArn: localSecret.idpArn,
        sessionId: localSecret.sessionId,
      });
    });
  });

  test("TeamService.isOrphanedChainedSession", () => {
    createTeamServiceInstance();
    expect((teamService as any).isOrphanedChainedSession({ assumerSessionId: undefined, assumerIntegrationId: undefined })).toBe(true);
    expect((teamService as any).isOrphanedChainedSession({ assumerSessionId: "assumer-id", assumerIntegrationId: undefined })).toBe(false);
    expect((teamService as any).isOrphanedChainedSession({ assumerSessionId: undefined, assumerIntegrationId: "assumer-id" })).toBe(false);
  });

  describe("getAssumerSessionId()", () => {
    beforeEach(() => {
      createTeamServiceInstance();
    });

    test("localSessionDto.assumereSessionId defined", async () => {
      const localSessionDto = { assumerSessionId: "fake-assumer-session-id" };

      const result = await teamService.getAssumerSessionId(localSessionDto);
      expect(result).toBe("fake-assumer-session-id");
    });

    test("localSessionDto.assumereSessionId not defined ssoSession.length === 1", async () => {
      const localSessionDto = {
        assumerIntegrationId: "fake-assumer-integration-id",
        assumerAccountId: "fake-assumer-account-id",
        assumerRoleName: "fake-assumer-role-name",
      };
      const sessions = [
        {
          sessionId: "fake-session-id-1",
          awsSsoConfigurationId: localSessionDto.assumerIntegrationId,
          roleArn: `arn:aws:iam::${localSessionDto.assumerAccountId}/${localSessionDto.assumerRoleName}`,
        },
        {
          sessionId: "fake-session-id-2",
          awsSsoConfigurationId: "another-fake-assumer-integration-id",
          roleArn: "another::arn:aws:iam::another-fake-assumer-account-id/another-fake-assumer-role-name",
        },
        {
          sessionId: "fake-session-id-3",
          awsSsoConfigurationId: "another-fake-assumer-integration-id",
          roleArn: "another::arn:aws:iam::another-fake-assumer-account-id/another-fake-assumer-role-name",
        },
      ];
      teamService.awsSsoIntegrationService = {
        syncSessions: jest.fn(() => sessions),
      };
      teamService.sessionManagementService = { getAwsSsoRoles: jest.fn(() => sessions) };

      const result = await teamService.getAssumerSessionId(localSessionDto);
      expect(result).toBe("fake-session-id-1");
      expect(teamService.awsSsoIntegrationService.syncSessions).toHaveBeenCalledWith(localSessionDto.assumerIntegrationId);
      expect(teamService.sessionManagementService.getAwsSsoRoles).toHaveBeenCalled();
    });

    test("localSessionDto.assumereSessionId not defined ssoSession.length < 1", async () => {
      const localSessionDto = {
        assumerIntegrationId: "fake-assumer-integration-id",
        assumerAccountId: "fake-assumer-account-id",
        assumerRoleName: "fake-assumer-role-name",
      };
      teamService.awsSsoIntegrationService = {
        syncSessions: jest.fn(() => []),
      };
      teamService.sessionManagementService = { getAwsSsoRoles: jest.fn(() => []) };

      await expect(teamService.getAssumerSessionId(localSessionDto)).rejects.toThrow(
        new LoggedException("Cannot find a proper SSO role from SSO integrations", this, LogLevel.error)
      );
      expect(teamService.awsSsoIntegrationService.syncSessions).toHaveBeenCalledWith(localSessionDto.assumerIntegrationId);
      expect(teamService.sessionManagementService.getAwsSsoRoles).toHaveBeenCalled();
    });

    test("localSessionDto.assumereSessionId not defined ssoSession.length > 1", async () => {
      const localSessionDto = {
        assumerIntegrationId: "fake-assumer-integration-id",
        assumerAccountId: "fake-assumer-account-id",
        assumerRoleName: "fake-assumer-role-name",
      };
      const sessions = [
        {
          sessionId: "fake-session-id-1",
          awsSsoConfigurationId: localSessionDto.assumerIntegrationId,
          roleArn: `arn:aws:iam::${localSessionDto.assumerAccountId}/${localSessionDto.assumerRoleName}`,
        },
        {
          sessionId: "fake-session-id-1",
          awsSsoConfigurationId: localSessionDto.assumerIntegrationId,
          roleArn: `arn:aws:iam::${localSessionDto.assumerAccountId}/${localSessionDto.assumerRoleName}`,
        },
        {
          sessionId: "fake-session-id-3",
          awsSsoConfigurationId: "another-fake-assumer-integration-id",
          roleArn: "another::arn:aws:iam::another-fake-assumer-account-id/another-fake-assumer-role-name",
        },
      ];
      teamService.awsSsoIntegrationService = {
        syncSessions: jest.fn(() => sessions),
      };
      teamService.sessionManagementService = { getAwsSsoRoles: jest.fn(() => sessions) };

      await expect(teamService.getAssumerSessionId(localSessionDto)).rejects.toThrow(
        new LoggedException("Multiple SSO roles found in SSO integrations", this, LogLevel.error)
      );
      expect(teamService.awsSsoIntegrationService.syncSessions).toHaveBeenCalledWith(localSessionDto.assumerIntegrationId);
      expect(teamService.sessionManagementService.getAwsSsoRoles).toHaveBeenCalled();
    });
  });

  describe("setupAwsSession()", () => {
    beforeEach(() => {
      createTeamServiceInstance();
    });
    test("localSession defined", async () => {
      const sessionService = { delete: jest.fn() };
      const sessionId = "fake-session-id";
      const profileName = "fake-profile-name";
      teamService.sessionManagementService = { getSessionById: jest.fn(() => ({ profileId: "fake-profile-id" })) };

      const result = await teamService.setupAwsSession(sessionService, sessionId, profileName);
      expect(result).toBe("fake-profile-id");
      expect(teamService.sessionManagementService.getSessionById).toHaveBeenCalledWith(sessionId);
      expect(sessionService.delete).toHaveBeenCalledWith(sessionId);
    });

    test("localSession undefined", async () => {
      const sessionService = { delete: jest.fn() };
      const sessionId = "fake-session-id";
      const profileName = "fake-profile-name";
      teamService.sessionManagementService = { getSessionById: jest.fn(() => undefined) };
      teamService.namedProfilesService = { mergeProfileName: jest.fn(() => ({ id: "fake-id" })) };

      const result = await teamService.setupAwsSession(sessionService, sessionId, profileName);
      expect(result).toBe("fake-id");
      expect(teamService.sessionManagementService.getSessionById).toHaveBeenCalledWith(sessionId);
      expect(sessionService.delete).not.toHaveBeenCalledWith(sessionId);
      expect(teamService.namedProfilesService.mergeProfileName).toHaveBeenCalledWith(profileName);
    });
  });

  test("getRSAKeys()", async () => {
    teamService.encryptionProvider = { importRsaKeys: jest.fn() };
    const user = { privateRSAKey: "fake-private-rsa-key", publicRSAKey: "fake-public-rsa-key" };

    await teamService.getRSAKeys(user);
    expect(teamService.encryptionProvider.importRsaKeys).toHaveBeenCalledWith({
      privateKey: "fake-private-rsa-key",
      publicKey: "fake-public-rsa-key",
    });
  });

  test("isJwtTokenExpired()", () => {
    jest.useFakeTimers().setSystemTime(new Date("1995-05-21"));
    let expirationDate = '{"exp":"801100800"}';
    let expirationDateEncoded = btoa(expirationDate);
    let jwtToken = `querty.${expirationDateEncoded}`;
    let result = teamService.isJwtTokenExpired(jwtToken);
    expect(result).toBe(false);

    expirationDate = '{"exp":"800928000"}';
    expirationDateEncoded = btoa(expirationDate);
    jwtToken = `querty.${expirationDateEncoded}`;
    result = teamService.isJwtTokenExpired(jwtToken);
    expect(result).toBe(true);
    jest.useRealTimers();
  });

  test("getTeamLockFileName", () => {
    createTeamServiceInstance();
    const result = (teamService as any).getTeamLockFileName("mocked-team-name");
    expect(result).toBe(".Leapp/Leapp-mocked-team-name-lock.json");
  });

  test("loadAndDecryptWorkspace, local workspace", () => {
    createTeamServiceInstance();
    teamService.nativeService = {
      machineId: "mocked-id",
    };
    workspaceService.setWorkspaceFileName = jest.fn();
    workspaceService.reloadWorkspace = jest.fn();
    teamService.loadAndDecryptWorkspace();
    expect(fileService.aesKey).toEqual("mocked-id");
    expect(workspaceService.setWorkspaceFileName).toHaveBeenCalledWith(constants.lockFileDestination);
    expect(workspaceService.reloadWorkspace).toHaveBeenCalled();
  });

  test("loadAndDecryptWorkspace, remote workspace", () => {
    createTeamServiceInstance();
    const signedInUser = { publicRSAKey: "mocked-public-rsa-key", teamId: "mocked-team-id" };
    workspaceService.setWorkspaceFileName = jest.fn();
    teamService.getTeamLockFileName = jest.fn(() => "mocked-team-lock-file-name");
    teamService.loadAndDecryptWorkspace(signedInUser);
    expect(fileService.aesKey).toEqual("mocked-public-rsa-key");
    expect(teamService.getTeamLockFileName).toHaveBeenCalledWith("mocked-team-id");
    expect(workspaceService.setWorkspaceFileName).toHaveBeenCalledWith("mocked-team-lock-file-name");
  });
});
