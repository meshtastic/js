export interface Position {
  latitudeI: number;
  longitudeI: number;
  altitude: number;
  time: number;
}

export interface NodeInfo {
  num: number;
  position: Position;
  user: any;
}
