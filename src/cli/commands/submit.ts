import consola from 'consola';
import { publishExtension } from '../..';
import {
  ChromeWebStore,
  EdgeAddonStore,
  FirefoxAddonStore,
} from '../../stores';
import { defineCommand } from '../defineCommand';
import { camelToKebab, Flags } from '../flags';

export default defineCommand(async flags => {
  const logger = consola;
  const { chromeZip, firefoxZip, edgeZip } = flags;

  const nothingToDo =
    chromeZip == null && firefoxZip == null && edgeZip == null;

  if (nothingToDo) {
    logger.warn(
      'Nothing to publish. Pass any combination of --chrome-zip, --firefox-zip, or --edge-zip to publish to the stores',
    );
    return process.exit(1);
  }

  const deps = {
    logger,
    chrome: ChromeWebStore,
    firefox: FirefoxAddonStore,
    edge: EdgeAddonStore,
  };

  const requireString = <T extends keyof Flags>(
    key: T,
  ): NonNullable<Flags[T]> => {
    if (flags[key] == null) throw Error(`--${camelToKebab(key)} is required`);
    return flags[key]!;
  };
  const optionalBoolean = <T extends keyof Flags>(
    key: T,
  ): boolean | undefined => {
    if (flags[key] == null) return undefined;
    return flags[key] === 'true';
  };

  const result = await publishExtension(
    {
      dryRun: optionalBoolean('dryRun'),
      chrome: chromeZip
        ? {
            zip: chromeZip,
            extensionId: requireString('chromeExtensionId'),
            clientId: requireString('chromeClientId'),
            clientSecret: requireString('chromeClientSecret'),
            refreshToken: requireString('chromeRefreshToken'),
            publishTarget: flags.chromePublishTarget,
            skipSubmitReview: optionalBoolean('chromeSkipSubmitReview'),
          }
        : undefined,
      firefox: firefoxZip
        ? {
            zip: firefoxZip,
            sourcesZip: flags.firefoxSourcesZip,
            extensionId: requireString('firefoxExtensionId'),
            jwtIssuer: requireString('firefoxJwtIssuer'),
            jwtSecret: requireString('firefoxJwtSecret'),
            channel: flags.firefoxChannel,
          }
        : undefined,
      edge: edgeZip
        ? {
            zip: edgeZip,
            productId: requireString('edgeProductId'),
            clientId: requireString('edgeClientId'),
            clientSecret: requireString('edgeClientSecret'),
            accessTokenUrl: requireString('edgeAccessTokenUrl'),
            skipSubmitReview: optionalBoolean('edgeSkipSubmitReview'),
          }
        : undefined,
    },
    deps,
  );

  const failureCount = Object.values(result).reduce(
    (count, result) => (result.success ? count : count + 1),
    0,
  );

  process.exit(failureCount);
});
