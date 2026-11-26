/** A saved delivery address in the end-user's address book. */
export interface UserAddress {
  id: string;
  title: string;
  receiverName: string;
  phone: string;
  province: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  title?: string;
  receiverName: string;
  phone: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  address: string;
  postalCode?: string;
  isDefault?: boolean;
}
