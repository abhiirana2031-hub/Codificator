import { verifiedLicenses } from '../licenseRegistry';

export const gitToolsModule = {
  id: "git-dev-tools",
  courseId: "git-dev-tools",
  title: "Git, GitHub & Modern Developer Tooling",
  category: "Engineering & Tools",
  level: "Beginner to Advanced",
  rating: 4.97,
  reviewsCount: 18400,
  studentsCount: "460k+",
  instructor: "HackYourFuture CLI/Git Team & Linux Foundation Contributors",
  bannerGradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)",
  badge: "CC-BY-4.0 Flagship",
  description: "Master version control and developer workflows adapted from HackYourFuture CLI-Git: Directed Acyclic Graph (DAG) internals, Content-Addressable Object Storage, the 3-Tree architecture, Interactive Rebasing, and Conflict Resolution.",
  highlights: [
    "Git internal object model: Blobs (data), Trees (directories), Commits (metadata), and 40-character SHA-1/SHA-256 hashes",
    "The 3-Tree mental model: Working Tree vs Staging Area (Index) vs Repository (.git HEAD)",
    "Branching mechanics as lightweight 41-byte movable pointers; Fast-Forward vs 3-Way Recursive merge graphs",
    "Interactive rebasing (git rebase -i), squashing commits, cherry-picking, and reflog disaster recovery"
  ],
  modules: [
    {
      id: "git-m1",
      title: "Module 1: Version Control Architecture & DAG Mechanics",
      chapters: [
        {
          id: "git-m1-c1",
          title: "Chapter 1: Git Object Model, Staging Index & Branching Graph",
          lessons: [
            {
              id: "git-m1-c1-l1",
              title: "The Git Object Model (Blobs, Trees, Commits) & The 3-Tree Architecture",
              estimatedReadTime: "16 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",

              // 1. Learning Objectives
              objectives: [
                "Deconstruct Git's content-addressable storage into its 4 fundamental object types: Blob, Tree, Commit, and Annotated Tag.",
                "Trace how file modifications transition across the 3 Trees: Working Directory -> Staging Area (Index) -> Git Object Database (HEAD).",
                "Execute clean Fast-Forward and 3-Way Merges, and analyze the common ancestor (merge base) during conflict resolution."
              ],

              // 2. Prerequisites
              prerequisites: [
                { title: "Command-Line Interface (CLI) navigation (cd, ls, mkdir, rm)" },
                { title: "Basic understanding of cryptographic hash functions (SHA-1, collision resistance)" }
              ],

              // 3. Detailed Original Explanations
              explanation: `### What is Git? A Content-Addressable Filesystem with a VCS User Interface

Most traditional VCS systems (CVS, Subversion) think of information as a list of file-based changes (delta-based version control).
**Git thinks of its data more like a stream of snapshots.** Every time you commit, Git takes a picture of what all your files look like at that moment and stores a reference to that snapshot.

\`\`\`
  Traditional VCS (Delta-based):
  File A: [Base] ----> [Delta 1] ----> [Delta 2]

  Git (Snapshot-based Stream):
  Commit 1: [Snapshot A1] [Snapshot B1] [Snapshot C1]
  Commit 2: [Snapshot A2] [   --   ] [Snapshot C2]  <-- unchanged files are hard-linked!
\`\`\`

---

### The 4 Core Git Objects

Inside \`.git/objects/\`, Git stores compressed zlib files named by their 40-character hexadecimal SHA-1 hashes (the first 2 characters are the folder name, the remaining 38 characters are the filename).

1. **Blob (Binary Large Object)**:
   - Stores raw file content and file size.
   - **Crucial Fact**: Blobs do *not* store file names, modification dates, or permissions! If two files in different directories have identical content, they share the exact same blob SHA-1.
2. **Tree**:
   - Represents a directory in the filesystem.
   - Stores a list of entries mapping permissions (100644 for file, 040000 for directory), object types (blob or tree), SHA-1 hashes, and the actual **file names**!
3. **Commit**:
   - Points to a top-level root Tree object representing the repository state.
   - Points to parent commit SHA-1 hashes (0 for initial commit, 1 for normal commit, 2+ for merge commits).
   - Stores author, committer timestamps, PGP signature, and the commit message.
4. **Annotated Tag**:
   - A permanent pointer to a specific commit containing tagger name, date, and release notes.

---

### The 3-Tree Architecture

At any given moment, your workspace exists across three conceptual zones:

\`\`\`
 +-------------------+        git add        +-------------------+       git commit      +-------------------+
 |   Working Tree    | --------------------> |   Staging Index   | --------------------> |   HEAD / .git DB  |
 | (Files on disk)   | <-------------------- |  (.git/index)     | <-------------------- | (Committed Object)|
 +-------------------+      git checkout     +-------------------+      git reset HEAD   +-------------------+
\`\`\`

- **Working Tree**: The actual physical sandbox on your local disk where you edit files in your editor.
- **Staging Index (\`.git/index\`)**: A binary cache tracking the exact proposed snapshot for your next commit. When you run \`git add\`, Git writes blobs to the database immediately and updates the index.
- **HEAD (Repository)**: A pointer (usually stored in \`.git/HEAD\`) that references the currently checked-out commit branch pointer.

---

### Branching & Merging: Fast-Forward vs Three-Way

A branch in Git is not a heavy copy of files—**it is simply a lightweight 41-byte text file** in \`.git/refs/heads/\` containing a 40-character commit SHA-1!

- **Fast-Forward Merge**: If the target branch has no divergent commits from the source branch's base, Git simply slides the branch pointer forward without creating a new merge commit.
- **Three-Way Merge**: If both branches have new commits since diverging, Git locates the **Merge Base** (the most recent common ancestor) and computes changes from both sides. If changes touch different lines, Git creates a new **Merge Commit** with two parent pointers!`,

              // 4. Definitions and Key Concepts
              keyConcepts: [
                {
                  term: "Content-Addressable Storage",
                  definition: "A mechanism for storing information so that data can be retrieved based on its content (via SHA-1/SHA-256 cryptographic hash) rather than its storage location or filename."
                },
                {
                  term: "Merge Base",
                  definition: "The most recent common ancestor commit shared between two divergent branches, used by Git to execute three-way merge algorithms."
                },
                {
                  term: "Staging Index",
                  definition: "The intermediate binary buffer (.git/index) holding the prepared snapshot of files scheduled to be saved in the upcoming commit."
                },
                {
                  term: "Reflog",
                  definition: "Git's local reference log that records every movement of the HEAD pointer, allowing recovery of deleted branches or reset commits."
                }
              ],

              // 5. Step-by-Step Worked Examples
              workedExamples: [
                {
                  title: "Step-by-Step Merge Conflict Resolution Workflow",
                  scenario: "Resolve a merge conflict in 'config.json' when merging feature-auth into main where both branches edited port settings.",
                  steps: [
                    {
                      stepNumber: 1,
                      action: "Initiate Merge",
                      stateSnapshot: "Run 'git merge feature-auth'. Git outputs: CONFLICT (content): Merge conflict in config.json. Automatic merge failed."
                    },
                    {
                      stepNumber: 2,
                      action: "Inspect Conflict Markers",
                      stateSnapshot: "File contains markers: <<<<<<< HEAD (port 3000) ======= (port 8080) >>>>>>> feature-auth."
                    },
                    {
                      stepNumber: 3,
                      action: "Manual Reconciliation",
                      stateSnapshot: "Developer consults team, edits file to retain port 8080, and removes all conflict marker lines entirely."
                    },
                    {
                      stepNumber: 4,
                      action: "Stage and Finalize",
                      stateSnapshot: "Run 'git add config.json' followed by 'git commit -m \"Merge feature-auth into main: configure port 8080\"'."
                    }
                  ],
                  result: "Merge commit successfully created with two parent SHA-1 references; workspace is clean."
                }
              ],

              // 6. Production Code Snippets
              codeSnippets: [
                {
                  language: "bash",
                  title: "Essential Everyday Git Plumbing & Diagnostic Commands",
                  code: `# 1. Inspect the type and content of any raw Git SHA-1 object
git cat-file -t <sha1-hash>   # Prints 'blob', 'tree', or 'commit'
git cat-file -p <sha1-hash>   # Pretty-prints the object content

# 2. View commit history graph in the terminal
git log --graph --oneline --all --decorate

# 3. Interactive rebase to clean up last 3 local commits before PR
git rebase -i HEAD~3

# 4. Emergency disaster recovery: view past HEAD positions
git reflog
git reset --hard HEAD@{2}   # Recover accidentally deleted commit!`,
                  annotation: "git cat-file and git reflog provide full diagnostic visibility into Git's internal content-addressable database."
                }
              ],

              // 7. Common Mistakes and Corrections
              pitfalls: [
                {
                  mistake: "Force-pushing (git push -f) to a shared public branch (main/develop).",
                  whyItHappens: "Rebasing rewrites commit SHA-1 hashes; force-pushing overwrites colleagues' histories, causing merge chaos.",
                  correction: "Never force-push to shared branches. Use 'git push --force-with-lease' for personal feature branches to verify no upstream changes exist."
                },
                {
                  mistake: "Committing sensitive API secrets or large binary files (videos, zip archives) into Git history.",
                  whyItHappens: "Deleting a secret in a subsequent commit does NOT remove it from Git history; past blobs remain accessible in .git/objects/.",
                  correction: "Use .gitignore from day 1, and use git filter-repo or BFG Repo-Cleaner if secrets are accidentally committed."
                }
              ],

              // 8. Diagrams and Structured Reference Tables
              visualAids: [
                {
                  type: "comparison-table",
                  title: "Git Merge vs Git Rebase Comparison",
                  content: `| Property | \`git merge\` | \`git rebase\` |
|---|---|---|
| **Commit History** | Preserves exact chronological timeline and branch topology | Creates a completely linear, clean sequence of commits |
| **Commit SHA-1s** | Unchanged; creates 1 new merge commit | Rewrites SHA-1 hashes for all moved commits |
| **Safety on Public Branches** | 100% safe for shared collaborative branches | Dangerous on shared branches; suitable for local private branches |
| **Traceability** | Easy to view when feature branch merged | Cleaner git bisect debugging without merge noise |`
                }
              ],

              // 9. Practice Exercises (With Automated Unit Test Runner)
              exercises: [
                {
                  difficulty: "Easy",
                  prompt: "Implement a function 'isFastForwardPossible(baseCommit, targetCommitHistory)' that returns true if baseCommit exists directly in targetCommitHistory, confirming a fast-forward merge is possible without creating a 3-way merge commit.",
                  hint: "Check if targetCommitHistory array includes baseCommit.",
                  starterCode: `function isFastForwardPossible(baseCommit, targetCommitHistory) {
  if (!Array.isArray(targetCommitHistory)) return false;
  return targetCommitHistory.includes(baseCommit);
}`,
                  testCases: [
                    {
                      input: { baseCommit: "c1a2b3", targetCommitHistory: ["c1a2b3", "d4e5f6", "a7b8c9"] },
                      expected: true
                    },
                    {
                      input: { baseCommit: "x9y8z7", targetCommitHistory: ["c1a2b3", "d4e5f6"] },
                      expected: false
                    }
                  ]
                }
              ],

              // 10. Concept Checkpoint Quiz
              quiz: [
                {
                  question: "Where are file names stored inside Git's internal object database?",
                  options: [
                    "Inside the Blob object itself.",
                    "Inside the Tree object that points to the Blob.",
                    "Directly in .git/HEAD.",
                    "File names are not stored; Git relies solely on SHA-1 hashes."
                  ],
                  correctIndex: 1,
                  explanation: "In Git, Blobs contain only raw file content. File names, directories, and permission modes are stored exclusively in Tree objects that reference those Blobs."
                }
              ],

              // 11. Chapter Summary & Revision Notes
              summary: {
                takeaways: [
                  "Git is a content-addressable object store utilizing 4 object types: Blobs (content), Trees (directories), Commits (snapshots), and Tags.",
                  "Files transition across 3 trees: Working Directory -> Staging Index (.git/index) -> Committed Repository (HEAD).",
                  "Branches are lightweight 41-byte pointers. Merges can fast-forward or compute 3-way joins using the common merge base."
                ],
                quickCheatSheet: "git cat-file -p <hash> inspects objects. git reflog tracks all HEAD movements. git add stages into .git/index. git rebase rewrites local commit histories."
              },

              // 12. Further Reading & Licensing Provenance
              metadata: {
                furtherReading: [
                  {
                    title: "HackYourFuture CLI & Git Curriculum",
                    url: "https://github.com/HackYourFuture/curriculum/blob/master/CLI-Git/README.md",
                    annotation: "Practical beginner to intermediate guide to version control, CLI, and team workflows."
                  },
                  {
                    title: "Pro Git Book by Scott Chacon and Ben Straub",
                    url: "https://git-scm.com/book/en/v2",
                    annotation: "The definitive open-source guide to Git internals, plumbing, and advanced branching."
                  }
                ],
                licenseRecord: verifiedLicenses["lic-hackyourfuture"]
              }
            }
          ]
        }
      ]
    }
  ]
};
