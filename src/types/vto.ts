export type Gender = 'male' | 'female';
export type Category = 'tshirts' | 'pants' | 'jackets' | 'shoes';
export type Brand = 'Nike' | 'Adidas' | 'Zara';

export interface VTORequest {
  gender: Gender;
  category: Category;
  currentBrand: Brand;
  currentSize: string;
  targetBrand: Brand;
  userImage?: File;
}

export interface VTOResponse {
  imageUrl: string;
  mappedSize: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SizeMapping {
  fromBrand: Brand;
  fromSize: string;
  toBrand: Brand;
  toSize: string;
  category: Category;
  gender: Gender;
}

export interface VTOHealthCheck {
  status: string;
  model: string;
}



