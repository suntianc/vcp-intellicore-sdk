# Contributing to VCP SDK

Thank you for your interest in contributing to VCP SDK! 🎉

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)

---

## 📜 Code of Conduct

We are committed to providing a welcoming and inspiring community for all.

**Expected Behavior**:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards others

---

## 🤝 How to Contribute

### Ways to Contribute

1. **Report Bugs** - Found a bug? Open an issue!
2. **Suggest Features** - Have an idea? We'd love to hear it!
3. **Improve Documentation** - Typos, unclear sections, or missing info
4. **Write Code** - Bug fixes, new features, or performance improvements
5. **Add Examples** - Show others how to use VCP SDK

---

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Git
- TypeScript knowledge

### Setup Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/vcp-sdk.git
cd vcp-sdk

# 3. Add upstream remote
git remote add upstream https://github.com/vcp-project/vcp-sdk.git

# 4. Install dependencies
npm install

# 5. Build the project
npm run build

# 6. Run tests
npm test

# 7. Create a feature branch
git checkout -b feature/my-awesome-feature
```

---

## 📁 Project Structure

```
vcp-sdk/
├── src/
│   ├── types/              # Type definitions
│   │   └── index.ts
│   ├── protocol/           # Protocol parser
│   │   ├── VCPProtocolParser.ts
│   │   └── index.ts
│   ├── variable/           # Variable engine
│   │   ├── VariableEngine.ts
│   │   ├── providers/
│   │   │   ├── TimeProvider.ts
│   │   │   ├── EnvironmentProvider.ts
│   │   │   ├── PlaceholderProvider.ts
│   │   │   └── ToolDescriptionProvider.ts
│   │   └── index.ts
│   ├── plugin/             # Plugin runtime
│   │   ├── PluginRuntime.ts
│   │   └── index.ts
│   └── index.ts            # Main entry
├── examples/               # Example projects
├── tests/                  # Test files
├── docs/                   # Documentation
└── dist/                   # Compiled output (gitignored)
```

---

## 🎨 Coding Standards

### TypeScript Style

```typescript
// ✅ Good
interface MyInterface {
  /** Field description */
  field: string;
}

class MyClass implements MyInterface {
  field: string;
  
  constructor(field: string) {
    this.field = field;
  }
  
  /**
   * Method description
   * @param arg - Argument description
   * @returns Return value description
   */
  myMethod(arg: string): string {
    return this.field + arg;
  }
}

// ❌ Avoid
class badClass {  // Bad naming
  public field;   // Missing type
  myMethod(arg) { // Missing types
    return arg;   // Missing return type
  }
}
```

### Naming Conventions

- **Interfaces**: `IMyInterface` (prefix with I)
- **Classes**: `MyClass` (PascalCase)
- **Methods**: `myMethod` (camelCase)
- **Constants**: `MY_CONSTANT` (UPPER_SNAKE_CASE)
- **Private fields**: `_privateField` or `private privateField`

### Comments

```typescript
/**
 * Class/function description
 * 
 * Detailed explanation if needed
 * 
 * @param param1 - Parameter description
 * @returns Return value description
 * 
 * @example
 * ```typescript
 * const result = myFunction('test');
 * ```
 */
```

---

## 🧪 Testing Guidelines

### Test Structure

```typescript
describe('FeatureName', () => {
  describe('method or scenario', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await doSomething(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Test Coverage Requirements

- **New Features**: Must have tests
- **Bug Fixes**: Add regression test
- **Coverage**: Aim for >80% for new code

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- variable.test.ts

# Run with coverage
npm test -- --coverage
```

---

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Add or update tests
- `chore`: Build process or auxiliary tools

### Examples

```bash
# Feature
git commit -m "feat(variable): add custom provider support"

# Bug fix
git commit -m "fix(protocol): handle empty tool args correctly"

# Documentation
git commit -m "docs(api): add examples for PluginRuntime"

# Performance
git commit -m "perf(variable): implement RegExp caching"
```

---

## 🔄 Pull Request Process

### Before Submitting

1. **Code Quality**
   - [ ] No TypeScript errors
   - [ ] Code follows style guide
   - [ ] Comments added for complex logic

2. **Tests**
   - [ ] All existing tests pass
   - [ ] New tests added if needed
   - [ ] Test coverage maintained

3. **Documentation**
   - [ ] README updated if needed
   - [ ] API docs updated for new/changed APIs
   - [ ] Inline comments added
   - [ ] CHANGELOG.md updated

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass
```

### Review Process

1. Submit PR
2. Automated checks run
3. Code review by maintainers
4. Address feedback
5. Approval and merge

---

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Step 1
2. Step 2
3. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Environment**
- OS: [e.g., Windows 11]
- Node.js version: [e.g., 18.17.0]
- VCP SDK version: [e.g., 1.0.0-beta.1]

**Additional Context**
Any other relevant information
```

---

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How would you implement this?

**Alternatives Considered**
What other approaches did you consider?

**Additional Context**
Mockups, examples, or references
```

---

## 📚 Documentation Guidelines

### Documentation Types

1. **API Documentation** - In `docs/API.md`
   - Method signatures
   - Parameter descriptions
   - Examples

2. **Guide Documentation** - In `docs/GUIDE.md`
   - Tutorials
   - Best practices
   - Integration patterns

3. **Inline Comments** - In source code
   - Complex logic explanation
   - Why, not what

### Documentation Style

```typescript
/**
 * Brief one-line description
 * 
 * Longer description with details.
 * Can span multiple lines.
 * 
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 * 
 * @throws VCPError - When error occurs
 * 
 * @example
 * ```typescript
 * const result = myFunction('test', 123);
 * // => 'expected output'
 * ```
 */
```

---

## 🏗️ Adding New Features

### Checklist

1. **Design**
   - [ ] Feature aligns with project goals
   - [ ] Interface designed (if applicable)
   - [ ] Breaking changes identified

2. **Implementation**
   - [ ] Code written following standards
   - [ ] Error handling added
   - [ ] Type annotations complete

3. **Testing**
   - [ ] Unit tests added
   - [ ] Integration tests if needed
   - [ ] Edge cases covered

4. **Documentation**
   - [ ] API docs updated
   - [ ] Guide updated if needed
   - [ ] Example added if helpful
   - [ ] CHANGELOG.md updated

---

## 🔍 Code Review Checklist

### For Reviewers

- [ ] Code follows project style
- [ ] Logic is correct and efficient
- [ ] Error handling is appropriate
- [ ] Tests are adequate
- [ ] Documentation is clear
- [ ] No security issues
- [ ] Performance is acceptable

### For Contributors

- [ ] Self-review done
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commits are clean
- [ ] Ready for review

---

## 🚀 Release Process

(For maintainers only)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run all tests
4. Build: `npm run build`
5. Test publish: `npm pack`
6. Publish: `npm publish`
7. Tag release: `git tag v1.0.0`
8. Push: `git push --tags`

---

## 💬 Getting Help

- **Questions**: Open a [Discussion](https://github.com/vcp-project/vcp-sdk/discussions)
- **Bugs**: Open an [Issue](https://github.com/vcp-project/vcp-sdk/issues)
- **Chat**: Join our community (link TBD)

---

## 🙏 Thank You!

Every contribution, no matter how small, is valuable and appreciated!

**Contributors**: See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for our amazing contributors!

---

**Happy Contributing! 🎉**

