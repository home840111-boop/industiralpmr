interface Breadcumb {
  title: string;
  link: string;
  children?: Breadcumb[];
}

interface Route {
  title: string;
  breadcumbs: Breadcumb[];
  invisible?: boolean;
}

interface Routes {
  [key: string]: Route;
}

export type { Breadcumb, Route, Routes };
