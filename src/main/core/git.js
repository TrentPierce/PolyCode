const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

class GitManager {
  constructor() {
    this.git = null;
    this.projectPath = null;
  }

  /**
   * Initialize git with project directory
   * @param {string} projectPath - Path to the project directory
   */
  initialize(projectPath) {
    this.projectPath = projectPath;
    this.git = simpleGit(projectPath);
  }

  /**
   * Check if current directory is a git repository
   * @returns {Promise<boolean>}
   */
  async isGitRepo() {
    if (!this.git) {
      return false;
    }
    try {
      await this.git.checkIsRepo();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get git status including working tree and staged changes
   * @returns {Promise<Object>}
   */
  async getStatus() {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        return {
          current: null,
          tracking: null,
          files: [],
          ahead: 0,
          behind: 0
        };
      }

      const status = await this.git.status();

      // Get current branch
      const branch = status.current;

      // Process changed files
      const changedFiles = [];
      
      // Modified files
      status.modified.forEach(file => {
        changedFiles.push({
          path: file,
          status: 'M',
          workingTree: 'M',
          index: ' '
        });
      });

      // Added files (staged)
      status.created.forEach(file => {
        changedFiles.push({
          path: file,
          status: 'A',
          workingTree: ' ',
          index: 'A'
        });
      });

      // Deleted files
      status.deleted.forEach(file => {
        changedFiles.push({
          path: file,
          status: 'D',
          workingTree: 'D',
          index: ' '
        });
      });

      // Renamed files
      status.renamed.forEach(item => {
        changedFiles.push({
          path: item.to,
          status: 'R',
          workingTree: 'R',
          index: ' ',
          from: item.from
        });
      });

      // Staged modified files
      status.staged.forEach(file => {
        if (!changedFiles.find(f => f.path === file)) {
          changedFiles.push({
            path: file,
            status: 'M',
            workingTree: ' ',
            index: 'M'
          });
        }
      });

      // Conflicted files
      status.conflicted.forEach(file => {
        changedFiles.push({
          path: file,
          status: 'C',
          workingTree: 'C',
          index: 'C'
        });
      });

      // Untracked files
      status.files.forEach(file => {
        if (file.working_dir === '?' && !changedFiles.find(f => f.path === file.path)) {
          changedFiles.push({
            path: file.path,
            status: '??',
            workingTree: '?',
            index: ' '
          });
        }
      });

      return {
        current: branch,
        tracking: status.tracking,
        files: changedFiles,
        ahead: status.ahead,
        behind: status.behind
      };
    } catch (error) {
      console.error('Error getting git status:', error);
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  /**
   * Stage all changes and create a commit
   * @param {string} message - Commit message
   * @param {Object} authorInfo - Author information (name, email)
   * @returns {Promise<Object>}
   */
  async commit(message, authorInfo = {}) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      // Add all changes
      await this.git.add(['.']);

      // Create commit with author info if provided
      const commitOptions = {};
      if (authorInfo.name && authorInfo.email) {
        commitOptions['--author'] = `${authorInfo.name} <${authorInfo.email}>`;
      }

      const result = await this.git.commit(message, commitOptions);
      
      return {
        success: true,
        commit: result.commit,
        branch: result.branch,
        summary: result.summary
      };
    } catch (error) {
      console.error('Error committing:', error);
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  /**
   * Push current branch to remote
   * @returns {Promise<Object>}
   */
  async push() {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      const status = await this.git.status();
      
      if (!status.tracking) {
        throw new Error('No remote tracking branch set up');
      }

      const result = await this.git.push();
      
      return {
        success: true,
        pushed: result.pushed && result.pushed.length > 0,
        updated: result.updated && result.updated.length > 0,
        deleted: result.deleted && result.deleted.length > 0,
        branch: status.current
      };
    } catch (error) {
      console.error('Error pushing:', error);
      throw new Error(`Failed to push: ${error.message}`);
    }
  }

  /**
   * Pull changes from remote
   * @returns {Promise<Object>}
   */
  async pull() {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      const status = await this.git.status();
      
      if (!status.tracking) {
        throw new Error('No remote tracking branch set up');
      }

      const result = await this.git.pull();
      
      return {
        success: true,
        files: result.files,
        insertions: result.insertions,
        deletions: result.deletions,
        summary: result.summary
      };
    } catch (error) {
      console.error('Error pulling:', error);
      throw new Error(`Failed to pull: ${error.message}`);
    }
  }

  /**
   * Get list of branches
   * @returns {Promise<Object>}
   */
  async getBranches() {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      const branches = await this.git.branch();
      const current = branches.current;
      
      const allBranches = branches.all.map(branch => ({
        name: branch,
        isCurrent: branch === current
      }));

      return {
        current,
        all: allBranches,
        branches: branches.branches
      };
    } catch (error) {
      console.error('Error getting branches:', error);
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  /**
   * Checkout a branch
   * @param {string} branchName - Name of the branch to checkout
   * @returns {Promise<Object>}
   */
  async checkout(branchName) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      await this.git.checkout(branchName);
      
      return {
        success: true,
        branch: branchName
      };
    } catch (error) {
      console.error('Error checking out branch:', error);
      throw new Error(`Failed to checkout branch: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   * @param {string} branchName - Name of the new branch
   * @returns {Promise<Object>}
   */
  async createBranch(branchName) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      await this.git.checkoutLocalBranch(branchName);
      
      return {
        success: true,
        branch: branchName
      };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Get commit history
   * @param {number} maxCount - Maximum number of commits to retrieve
   * @returns {Promise<Object>}
   */
  async getHistory(maxCount = 20) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        return { commits: [] };
      }

      const log = await this.git.log({ maxCount });
      
      const commits = log.all.map(commit => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: commit.date,
        body: commit.body
      }));

      return {
        commits,
        total: log.total,
        latest: log.latest
      };
    } catch (error) {
      console.error('Error getting history:', error);
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  /**
   * Get diff for a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>}
   */
  async getDiff(filePath) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      const diff = await this.git.diff([filePath]);
      const diffSummary = await this.git.diffSummary([filePath]);
      
      return {
        diff,
        summary: diffSummary,
        filePath
      };
    } catch (error) {
      console.error('Error getting diff:', error);
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Get diff between working tree and HEAD (unstaged changes)
   * @param {string} filePath - Path to the file (optional)
   * @returns {Promise<Object>}
   */
  async getUnstagedDiff(filePath = null) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      const args = filePath ? [filePath] : [];
      const diff = await this.git.diff(args);
      
      return {
        diff,
        type: 'unstaged',
        filePath
      };
    } catch (error) {
      console.error('Error getting unstaged diff:', error);
      throw new Error(`Failed to get unstaged diff: ${error.message}`);
    }
  }

  /**
   * Get diff of staged changes
   * @param {string} filePath - Path to the file (optional)
   * @returns {Promise<Object>}
   */
  async getStagedDiff(filePath = null) {
    try {
      const isRepo = await this.isGitRepo();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      const args = filePath ? ['--cached', filePath] : ['--cached'];
      const diff = await this.git.diff(args);
      
      return {
        diff,
        type: 'staged',
        filePath
      };
    } catch (error) {
      console.error('Error getting staged diff:', error);
      throw new Error(`Failed to get staged diff: ${error.message}`);
    }
  }

  /**
   * Initialize a new git repository
   * @returns {Promise<Object>}
   */
  async init() {
    try {
      if (!this.projectPath) {
        throw new Error('No project path set');
      }

      await this.git.init();
      
      return {
        success: true,
        path: this.projectPath
      };
    } catch (error) {
      console.error('Error initializing git:', error);
      throw new Error(`Failed to initialize git: ${error.message}`);
    }
  }

  /**
   * Parse unified diff format for display
   * @param {string} diff - Unified diff string
   * @returns {Object} - Parsed diff with additions and deletions
   */
  parseDiff(diff) {
    const lines = diff.split('\n');
    const hunks = [];
    let currentHunk = null;

    lines.forEach(line => {
      if (line.startsWith('@@')) {
        // Start of a hunk
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          header: line,
          originalLines: [],
          modifiedLines: []
        };
      } else if (currentHunk) {
        if (line.startsWith(' ')) {
          // Unchanged line
          currentHunk.originalLines.push({ type: 'unchanged', content: line.substring(1) });
          currentHunk.modifiedLines.push({ type: 'unchanged', content: line.substring(1) });
        } else if (line.startsWith('-')) {
          // Deletion
          currentHunk.originalLines.push({ type: 'deletion', content: line.substring(1) });
        } else if (line.startsWith('+')) {
          // Addition
          currentHunk.modifiedLines.push({ type: 'addition', content: line.substring(1) });
        } else if (line.startsWith('\\') || line.startsWith('#')) {
          // No newline or comment, ignore
          return;
        }
      }
    });

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return { hunks };
  }
}

module.exports = { GitManager };
