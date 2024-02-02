import IEmulationProfile from '@ulixee/unblocked-specification/plugin/IEmulationProfile';
import IBrowserData from '../interfaces/IBrowserData';
import IUserAgentData from '../interfaces/IUserAgentData';
import DomOverridesBuilder from './DomOverridesBuilder';
export default function loadDomOverrides(emulationProfile: IEmulationProfile, data: IBrowserData, userAgentData: IUserAgentData): DomOverridesBuilder;
