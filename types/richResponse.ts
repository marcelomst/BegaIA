export type CarouselImage = {
  url: string;
  alt?: string;
};

export type CarouselItem = {
  title?: string;
  subtitle?: string;
  images: CarouselImage[];
};

export type RichResponse = {
  carousel?: CarouselItem[];
};
