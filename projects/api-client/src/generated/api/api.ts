export * from './development-only.service';
import { DevelopmentOnlyService } from './development-only.service';
export * from './platform-onboarding.service';
import { PlatformOnboardingService } from './platform-onboarding.service';
export * from './platform-practices.service';
import { PlatformPracticesService } from './platform-practices.service';
export * from './platform-reference-data.service';
import { PlatformReferenceDataService } from './platform-reference-data.service';
export const APIS = [DevelopmentOnlyService, PlatformOnboardingService, PlatformPracticesService, PlatformReferenceDataService];
