import IEmulationProfile from '@ulixee/unblocked-specification/plugin/IEmulationProfile';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
export default interface ITaskOptions extends
    Pick<IEmulationProfile, 'viewport' | 'timezoneId' | 'locale' | 'upstreamProxyIpMask' | 'upstreamProxyUrl' | 'geolocation' | 'dnsOverTlsProvider'>,
    Pick<ISessionCreateOptions, 'userAgent'>
{
    
}