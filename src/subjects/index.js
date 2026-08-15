// Subject Registry
// To add a new subject: create a new file in this folder, import it here, add one entry to SUBJECTS.
// Everything else (UI, Firebase, timer, history) works automatically.

import { algorithms } from './algorithms';
import { toc }        from './toc';
import { engmaths }   from './engmaths';

export const SUBJECTS = {
  algorithms,
  toc,
  engmaths,
};

export const SUBJECT_LIST = Object.values(SUBJECTS);
