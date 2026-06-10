// Theory of Computation — Lecture Data
// Source: Neso Academy TOC Course (precise durations from course page)
// 142 lectures across 6 modules
// Durations in minutes, rounded to nearest minute from HH:MM:SS timestamps
// Items marked "(Optional)" are included but not required for course completion
// Items marked "(est.)" had no timestamp available — duration is estimated

export const toc = {
  id: 'toc',
  name: 'Theory of Computation',
  shortName: 'TOC',
  icon: '🔤',
  accent: 'violet',
  defaultDailyGoalMins: 240,
  lectures: [

    // ─── Module 1: Regular Languages & Finite Automata ───────────────────

    { id: 1,  section: 'Module 1 · Regular Languages & Finite Automata', title: '(Optional) Lecture 1 — Theory of Computation Introduction, Motivation, Overview',  duration: 140  }, // 2:19:47
    { id: 2,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 2A — Basic Concepts: Alphabet, String',                                        duration: 44   }, // 44:17
    { id: 3,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 2B — Basic Concepts: Concatenation of Strings',                                duration: 19   }, // 18:31
    { id: 4,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 2C — Basic Concepts: Prefix, Suffix, Substring, Subsequence',                  duration: 47   }, // 47:15
    { id: 5,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 3A — Language',                                                                duration: 21   }, // 20:49
    { id: 6,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 3B — Set Operations on Languages',                                             duration: 26   }, // 26:00
    { id: 7,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 3C — Exponentiation of Language, Kleene Closure',                              duration: 37   }, // 37:02
    { id: 8,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 4 — Practice Questions: Basic Concepts',                                       duration: 20   }, // 19:56
    { id: 9,  section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 5 — Complement of a Language',                                                 duration: 34   }, // 34:22
    { id: 10, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 6 — What We Study in Theory of Computation & Why?',                            duration: 25   }, // 25:25
    { id: 11, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 7A — Finite Automata: Introduction',                                           duration: 50   }, // 49:32
    { id: 12, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 7B — Finite Automata: Part 2',                                                 duration: 53   }, // 53:26
    { id: 13, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 7C — Finite Automata: Formal Definition & Rules',                              duration: 25   }, // 25:05
    { id: 14, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8A — Deterministic Finite Automata (DFA)',                                     duration: 26   }, // 26:27
    { id: 15, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8B — Designing DFA Part 1',                                                    duration: 48   }, // 47:41
    { id: 16, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8C — Designing DFA Part 2',                                                    duration: 30   }, // 30:25
    { id: 17, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8D — Regular Language',                                                        duration: 17   }, // 17:10
    { id: 18, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8E — Designing DFA Part 3',                                                    duration: 47   }, // 46:55
    { id: 19, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8F — Designing DFA Part 4',                                                    duration: 37   }, // 36:54
    { id: 20, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8G — Designing DFA Part 5',                                                    duration: 15   }, // 15:23
    { id: 21, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 8H — Designing DFA Part 6',                                                    duration: 28   }, // 27:59
    { id: 22, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 9 — Extended Transition Function in DFA',                                      duration: 17   }, // 16:39
    { id: 23, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 10A — DFA for Complement of a Regular Language',                               duration: 28   }, // 28:15
    { id: 24, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 10B — Practice Questions',                                                     duration: 10   }, // 10:14
    { id: 25, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 10C — Recap: DFA for Complement of a Regular Language',                        duration: 10   }, // 10:28
    { id: 26, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 11 — The Product Construction of DFAs',                                       duration: 112  }, // 1:52:02
    { id: 27, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 12A — DFA Minimization Part 1',                                                duration: 27   }, // 26:54
    { id: 28, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 12B — DFA Minimization Part 2: State Equivalence',                             duration: 50   }, // 50:09
    { id: 29, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 12C — DFA Minimization Part 3: Practice Questions',                            duration: 22   }, // 21:54
    { id: 30, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 12D — DFA Minimization Part 4: Practice State Equivalence',                    duration: 30   }, // 29:42
    { id: 31, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 12E — DFA Minimization Part 5: Partition Algorithm',                           duration: 55   }, // 54:55
    { id: 32, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 12F — DFA Minimization Part 6: Practice Partition Algorithm',                  duration: 19   }, // 18:58
    { id: 33, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 13A — Configuration in DFA',                                                  duration: 9    }, // 08:50
    { id: 34, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 13B — Our First Non-Regular Language',                                         duration: 33   }, // 33:25
    { id: 35, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14A — NFA Introduction',                                                       duration: 21   }, // 21:15
    { id: 36, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14B — NFA Definition & Rules',                                                 duration: 27   }, // 26:50
    { id: 37, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14C — Understanding Non-Determinism',                                          duration: 42   }, // 41:41
    { id: 38, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14D — Designing NFA',                                                          duration: 26   }, // 26:25
    { id: 39, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14E — Practice Questions (NFA)',                                               duration: 22   }, // 22:00
    { id: 40, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14F — Null Moves in NFAs',                                                     duration: 43   }, // 42:45
    { id: 41, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14G — Peter Linz Question on NFA',                                             duration: 10   }, // 10:05
    { id: 42, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14H — NFA Practice & Extended Transition Function',                            duration: 26   }, // 26:06
    { id: 43, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 14i — NFA Formal Definition & Rules',                                          duration: 15   }, // 15:27
    { id: 44, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 15A — Extended Transition Function',                                           duration: 138  }, // 2:18:02
    { id: 45, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 15B — Equivalence of DFA & NFA',                                              duration: 146  }, // 2:25:50
    { id: 46, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16A — Regular Expression Part 1',                                              duration: 62   }, // 1:02:08
    { id: 47, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16B — Example Regular Expression',                                             duration: 8    }, // 07:56
    { id: 48, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16C — A Lot of Practice: Regular Expression',                                  duration: 61   }, // 1:00:39
    { id: 49, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16D — Regular Expression Analysis',                                            duration: 20   }, // 20:02
    { id: 50, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16E — Practice Questions: Regular Expression',                                 duration: 24   }, // 24:18
    { id: 51, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16F — Regular Expression: Analysis',                                           duration: 28   }, // 27:35
    { id: 52, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16G — Important Properties of Regular Expressions',                            duration: 70   }, // 1:10:09
    { id: 53, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 16H — Some Basic Properties of Regular Expressions',                           duration: 11   }, // 11:29
    { id: 54, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 17A — Equivalence of RE and FA Part 1: Somethings About NFAs',                 duration: 22   }, // 22:05
    { id: 55, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 17B — Equivalence of RE and FA Part 2: Converting RE to FA',                   duration: 29   }, // 28:44
    { id: 56, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 17C — Equivalence of RE and FA Part 3: FA to RE',                              duration: 8    }, // 07:31
    { id: 57, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 17D — Equivalence of RE and FA Part 4: FA to RE',                              duration: 20   }, // 20:00
    { id: 58, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 17E — Equivalence of RE and FA Part 5: Unary Alphabet DFA Analysis',           duration: 33   }, // 32:31
    { id: 59, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 17F — Equivalence of RE and FA Part 6: The Two Templates',                     duration: 60   }, // 59:36
    { id: 60, section: 'Module 1 · Regular Languages & Finite Automata', title: '(Optional) Lecture 18 — Pumping Lemma for Regular Languages',                          duration: 170  }, // 2:49:41
    { id: 61, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19A — Myhill-Nerode Theorem Part 1',                                           duration: 118  }, // 1:58:08
    { id: 62, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19B — Myhill-Nerode Theorem Part 2: Distinguishable Strings',                  duration: 57   }, // 57:26
    { id: 63, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19C — Myhill-Nerode Theorem Part 3: Practice',                                 duration: 39   }, // 39:07
    { id: 64, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19D — Myhill-Nerode Theorem Part 4: The Theorem',                              duration: 43   }, // 43:25
    { id: 65, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19E — Revision & Practice: Myhill-Nerode Theorem',                             duration: 130  }, // 2:10:04
    { id: 66, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19F — Finding Number of States in Minimal DFA',                                duration: 145  }, // 2:25:16
    { id: 67, section: 'Module 1 · Regular Languages & Finite Automata', title: 'Lecture 19G — GATE PYQs on Minimal DFA — Myhill-Nerode Theorem',                       duration: 120  }, // 2:00:28

    // ─── Module 2: Context Free Languages, Grammars, Pushdown Automata ──

    { id: 68, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1A — Context Free Grammars',                                                  duration: 137  }, // 2:17:14
    { id: 69, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1B — Practice & Standard Examples of CFGs',                                   duration: 114  }, // 1:53:58
    { id: 70, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1C — Regular Grammars',                                                        duration: 135  }, // 2:15:02
    { id: 71, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1D — Every Regular Language is CFL: Proof',                                   duration: 17   }, // 17:14
    { id: 72, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1E — Regular Grammar to NFA & Vice Versa',                                    duration: 99   }, // 1:39:11
    { id: 73, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1F — Ambiguity of CFGs Part 1: Derivations, Parse Tree, LMD, RMD',            duration: 83   }, // 1:22:56
    { id: 74, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1G — Practice Questions: Parse Tree & Derivations',                           duration: 60   }, // (est.) — missing timestamp
    { id: 75, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 1H — Ambiguity of CFGs & CFLs',                                               duration: 60   }, // (est.) — missing timestamp
    { id: 76, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2A — Push Down Automata (PDA): Definition & Rules',                           duration: 45   }, // (est.) — missing timestamp
    { id: 77, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2B — PDA Practice Questions',                                                  duration: 39   }, // 38:49
    { id: 78, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2C — PDA Analysis: Understanding PDA Transitions & Non-Determinism',           duration: 42   }, // 41:31
    { id: 79, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 1 — aⁿbⁿ Language',                                                duration: 21   }, // 21:19
    { id: 80, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 2 — aⁿbⁿ⁺¹ Language',                                              duration: 12   }, // 11:43
    { id: 81, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 3 — aⁿbᵐ Language',                                                duration: 11   }, // 11:25
    { id: 82, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 4 — aⁿbᵐ Language (variant)',                                      duration: 7    }, // 06:43
    { id: 83, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 5 — aⁿbᵐ Language (variant 2)',                                    duration: 13   }, // 13:16
    { id: 84, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 6 — aⁿb²ⁿ Language',                                               duration: 14   }, // 14:18
    { id: 85, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'PDA Design Example 7 — a²ⁿbⁿ Language',                                               duration: 17   }, // 16:47
    { id: 86, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2D — PDA Design: More Examples',                                              duration: 78   }, // 1:17:54
    { id: 87, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2E — PDA Analysis, Empty Stack Acceptance',                                   duration: 142  }, // 2:22:08
    { id: 88, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2F — Correction in a Question',                                               duration: 13   }, // 13:20
    { id: 89, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 2G — Practice: PDA with Empty Stack Acceptance',                              duration: 28   }, // 27:52
    { id: 90, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 3A — DPDA Part 1: What is Non-Determinism?',                                  duration: 19   }, // 19:19
    { id: 91, section: 'Module 2 · CFLs, Grammars & Pushdown Automata',  title: 'Lecture 3B — DPDA and DCFL',                                                          duration: 148  }, // 2:27:32

    // ─── Module 3: Identification of Language Class ───────────────────────

    { id: 92, section: 'Module 3 · Identification of Language Class',    title: 'Lecture 1A — Identification of Regular Languages',                                    duration: 75   }, // 1:14:39
    { id: 93, section: 'Module 3 · Identification of Language Class',    title: 'Lecture 1B — Practice: Identification of Regular Languages',                          duration: 28   }, // 28:03
    { id: 94, section: 'Module 3 · Identification of Language Class',    title: 'Lecture 1C — GATE CSE 2014: Identification of Regular Languages',                     duration: 45   }, // 45:19
    { id: 95, section: 'Module 3 · Identification of Language Class',    title: 'Lecture 2A — Identification of CFL, DCFL Languages',                                 duration: 67   }, // 1:07:05
    { id: 96, section: 'Module 3 · Identification of Language Class',    title: 'Lecture 2B — Identification of CFL, DCFL Languages (continued)',                      duration: 109  }, // 1:49:15

    // ─── Module 4: Closure Properties ────────────────────────────────────

    { id: 97,  section: 'Module 4 · Closure Properties',                 title: 'Lecture 1A — Closure Properties of Regular Languages',                                duration: 117  }, // 1:56:57
    { id: 98,  section: 'Module 4 · Closure Properties',                 title: 'Lecture 1B — Closure Properties of Regular Languages Part 2',                         duration: 107  }, // 1:46:57
    { id: 99,  section: 'Module 4 · Closure Properties',                 title: 'Lecture 2A — Closure Properties of CFLs',                                             duration: 164  }, // 2:44:20
    { id: 100, section: 'Module 4 · Closure Properties',                 title: 'Lecture 2B — Closure Properties of DCFLs',                                            duration: 69   }, // 1:09:02
    { id: 101, section: 'Module 4 · Closure Properties',                 title: 'Lecture 3 — Closure Properties of Nonregular Languages',                              duration: 84   }, // 1:23:36
    { id: 102, section: 'Module 4 · Closure Properties',                 title: 'Lecture 4 — Chomsky Hierarchy & Types of Grammars',                                   duration: 62   }, // 1:02:11
    { id: 103, section: 'Module 4 · Closure Properties',                 title: 'Lecture 5 — Non-Closure of Regular Languages',                                        duration: 25   }, // 24:46
    { id: 104, section: 'Module 4 · Closure Properties',                 title: 'Lecture 6 — Closure Properties of Finite Languages',                                  duration: 17   }, // 16:53
    { id: 105, section: 'Module 4 · Closure Properties',                 title: '(Optional) DCFLs are Not Closed under Concatenation and Kleene Closure',              duration: 14   }, // 13:46
    { id: 106, section: 'Module 4 · Closure Properties',                 title: 'GATE CSE 2021 — Number of States in Minimal DFA for L and L-Complement',              duration: 19   }, // 19:24

    // ─── Module 5: Turing Machines, Undecidability ────────────────────────

    { id: 107, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 1 — Introduction of Turing Machines',                                         duration: 123  }, // 2:02:40
    { id: 108, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 2 — Turing Machine Design',                                                   duration: 83   }, // 1:23:24
    { id: 109, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 3 — Turing Machine: Formal Definition',                                       duration: 21   }, // 20:44
    { id: 110, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 4 — Some Conjectures',                                                        duration: 27   }, // 26:34
    { id: 111, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 5 — Practice & Revision: Turing Machines',                                    duration: 164  }, // 2:43:37
    { id: 112, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 6 — Understanding Infinite Looping',                                          duration: 107  }, // 1:47:03
    { id: 113, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 7 — Decider, Decidable',                                                      duration: 20   }, // 19:44
    { id: 114, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 8 — Revision: Story So Far — Turing Machines',                                duration: 54   }, // 54:25
    { id: 115, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 9 — Dovetailing, Variants of TM',                                             duration: 111  }, // 1:50:39
    { id: 116, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 10 — Encoding and Decidability',                                              duration: 80   }, // 1:20:20
    { id: 117, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 11 — Language vs Decision Problem',                                           duration: 34   }, // 33:34
    { id: 118, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 12A — Revision & Practice of Encoding',                                       duration: 52   }, // 51:42
    { id: 119, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 12B — Revision & Practice of Decision Problems & Languages',                  duration: 107  }, // 1:46:45
    { id: 120, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 13 — Logically Solving Decision Problems related to Language of TMs',         duration: 104  }, // 1:44:29
    { id: 121, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 14A — Decision Problems of Regular Languages',                                duration: 101  }, // 1:41:29
    { id: 122, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 14B — Practice Questions on Decision Problems of Regular Languages',          duration: 33   }, // 32:40
    { id: 123, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 15A — Simplification of CFGs: Useless Symbols Removal',                      duration: 66   }, // 1:06:00
    { id: 124, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 15B — Simplification of CFGs: Null & Unit Production Removal',               duration: 73   }, // 1:12:55
    { id: 125, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 15C — Normal Forms of CFGs: CNF, GNF',                                       duration: 157  }, // 2:37:25
    { id: 126, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 15D — Decision Problems of Context Free Languages',                           duration: 103  }, // 1:42:53
    { id: 127, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 16A — Universal TM, Membership Problem of TM',                               duration: 102  }, // 1:41:44
    { id: 128, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 16B — Halting Problem of TM, Existence of Non-RE Language',                   duration: 114  }, // 1:53:59
    { id: 129, section: 'Module 5 · Turing Machines & Undecidability',   title: "Lecture 16C — Rice's Theorem",                                                        duration: 127  }, // 2:06:44
    { id: 130, section: 'Module 5 · Turing Machines & Undecidability',   title: "Lecture 16D — Practice and Revision: Rice's Theorem",                                 duration: 55   }, // 54:48
    { id: 131, section: 'Module 5 · Turing Machines & Undecidability',   title: "Lecture 16E — Rice's Theorem Part 3: Machine Property vs Language Property",          duration: 37   }, // 36:59
    { id: 132, section: 'Module 5 · Turing Machines & Undecidability',   title: "Lecture 16F — Rice's Theorem for Programs",                                           duration: 34   }, // 34:17
    { id: 133, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 17 — GATE Questions on Undecidability',                                       duration: 111  }, // 1:50:52
    { id: 134, section: 'Module 5 · Turing Machines & Undecidability',   title: 'Lecture 18 — Closure Properties of RE, REC Languages, Complement Theorem',           duration: 180  }, // 3:00:28

    // ─── Module 6: Countability ───────────────────────────────────────────

    { id: 135, section: 'Module 6 · Countability',                       title: 'Lecture 1 — Functions Revision, Cardinality & Understanding Infinity',                duration: 114  }, // 1:54:24
    { id: 136, section: 'Module 6 · Countability',                       title: 'Lecture 2 — Countable Sets',                                                          duration: 94   }, // 1:34:25
    { id: 137, section: 'Module 6 · Countability',                       title: "Lecture 3 — Uncountable Sets & Cantor's Diagonalization Proof",                       duration: 160  }, // 2:39:43
    { id: 138, section: 'Module 6 · Countability',                       title: 'Lecture 4 — Three Definitions of Countable Sets',                                     duration: 147  }, // 2:26:45
    { id: 139, section: 'Module 6 · Countability',                       title: 'Lecture 5 — Theorems for Countable Sets',                                             duration: 122  }, // 2:02:07
    { id: 140, section: 'Module 6 · Countability',                       title: "Lecture 6 — Cantor's Theorem & Consequences",                                         duration: 109  }, // 1:49:23
    { id: 141, section: 'Module 6 · Countability',                       title: 'Lecture 7 — Countability Results in Theory of Computation',                           duration: 155  }, // 2:35:08
    { id: 142, section: 'Module 6 · Countability',                       title: 'Lecture 8 — Previous Exams Questions: GATE, TIFR, NET',                               duration: 155  }, // 2:34:33
  ],
};
