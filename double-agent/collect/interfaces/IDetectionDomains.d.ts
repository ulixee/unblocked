/// <reference types="node" />
import { URL } from 'url';
export default interface IDetectionDomains {
    main: URL;
    external?: URL;
    subdomain?: URL;
}
