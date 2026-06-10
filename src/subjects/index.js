// Subject Registry
// To add a new subject: create a new file in this folder, import it here, add one entry to SUBJECTS.
// Everything else (UI, Firebase, timer, history) works automatically.

import { algorithms } from './algorithms';
import { toc }        from './toc';

export const SUBJECTS = {
  algorithms,
  toc,
};

export const SUBJECT_LIST = Object.values(SUBJECTS);
