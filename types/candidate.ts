export interface Candidate {
  id?: string | number;
  slug?: string;
  first_name: string;
  last_name: string;
  profession: string;
  gender: string;
  position: number;
  photo: string | null;
  voter_number: string;
  short_bio?: string | null;
  long_bio?: string | null;
  biography?: string | null;
  birthdate?: string;
  birthplace?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  documents?: any;
}
