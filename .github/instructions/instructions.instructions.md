---
description: always to follow the coding guidelines and project context when generating code, answering questions, or reviewing changes.

## Guiding Principles

*   **Simplicity and Maintainability**: Strive for the simplest possible solution that meets the current requirements. Avoid over-engineering or adding complexity.
*   **YAGNI (You Aren't Gonna Need It)**: Only implement features and functions that are explicitly requested. Do not add speculative or "nice-to-have" functionality.
*   **Favor Existing Code**: Prefer modifying and extending existing functions and files over creating new ones. A new file or function should only be created if absolutely necessary.

## Specific Instructions

*   **No Unnecessary Files**:
    *   **NEVER** create new documentation files (`*.md`), READMEs, or quick-start guides unless explicitly instructed by the user.
    *   **NEVER** create new files unless they are essential for the primary goal of the user's current request.
*   **Focus on the Task**: Address the user's request, nothing more, nothing less.
*   **Avoid Over-Modularization**: While modularity is good, avoid breaking code into excessive, small functions or modules that add unnecessary overhead.
*   **No Proactive Additions**: Do not "improve" the codebase by adding extra features, comments, or refactors that were not part of the original instruction.
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.