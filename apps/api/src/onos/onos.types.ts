export interface OnosAnnotations {
  [key: string]: string | undefined;
}

export interface OnosDevice {
  id: string; // e.g. "of:0000000000000001"
  type: string; // SWITCH, ROUTER, ROADM, ...
  available: boolean;
  role?: string;
  mfr?: string;
  hw?: string;
  sw?: string;
  serial?: string;
  driver?: string;
  chassisId?: string;
  annotations?: OnosAnnotations; // name, managementAddress, channelId, protocol
}

export interface OnosPort {
  element?: string;
  port: string; // "1", "2", "local"
  isEnabled: boolean;
  type?: string;
  portSpeed?: number; // Mbps
  annotations?: OnosAnnotations; // portMac, portName, adminState
}

export interface OnosConnectPoint {
  device: string;
  port: string;
}

export interface OnosLink {
  src: OnosConnectPoint;
  dst: OnosConnectPoint;
  type: string; // DIRECT, INDIRECT, ...
  state: string; // ACTIVE | INACTIVE
}

export interface OnosHostLocation {
  elementId: string;
  port: string;
}

export interface OnosHost {
  id: string; // "00:00:00:00:00:01/None"
  mac: string;
  vlan?: string;
  ipAddresses?: string[];
  locations?: OnosHostLocation[];
  configured?: boolean;
  annotations?: OnosAnnotations;
}

export interface OnosSnapshot {
  devices: Array<OnosDevice & { ports: OnosPort[] }>;
  hosts: OnosHost[];
  links: OnosLink[];
}
