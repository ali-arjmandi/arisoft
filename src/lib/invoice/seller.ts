export interface SellerInfo {
  legalName: string;
  addressLines: string[];
  kvkNumber: string;
  btwNumber: string;
  iban: string;
  email: string;
  website: string;
  paymentTermDays: number;
}

export const SELLER: SellerInfo = {
  legalName: "Arisoft",
  addressLines: ["Van Embdenstraat 820", "2628 ZP, Delft", "Netherlands"],
  kvkNumber: "42057545",
  btwNumber: "NL005462417B54",
  iban: "NL09 ABNA 0138 8422 21",
  email: "info@arisoft.nl",
  website: "arisoft.nl",
  paymentTermDays: 14,
};
