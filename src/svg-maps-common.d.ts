declare module "svg-maps__common" {
  export type MapLocation = {
    id: string;
    name: string;
    path: string;
  };

  export type Map = {
    label: string;
    viewBox: string;
    locations: MapLocation[];
  };
}
