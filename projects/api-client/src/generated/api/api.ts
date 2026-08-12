export * from './platform-onboarding.service';
import { PlatformOnboardingService } from './platform-onboarding.service';
export * from './platform-practices.service';
import { PlatformPracticesService } from './platform-practices.service';
export * from './platform-reference-data.service';
import { PlatformReferenceDataService } from './platform-reference-data.service';
export const APIS = [PlatformOnboardingService, PlatformPracticesService, PlatformReferenceDataService];
