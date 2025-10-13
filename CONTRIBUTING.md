# Contributing to ThunderV2 ERP

First off, thank you for considering contributing to ThunderV2! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)

## 🤝 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Include your environment details** (OS, Node version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List some examples of how it would be used**

### Pull Requests

- Fill in the required template
- Follow our coding standards
- Include appropriate test cases
- Update documentation as needed
- Ensure the test suite passes
- Make sure your code lints

## 🛠️ Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/ERP-V2.git
cd ERP-V2
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. **Run the development server**
```bash
npm run dev
```

5. **Create a new branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

## 🔄 Pull Request Process

1. **Update your fork**
```bash
git fetch upstream
git merge upstream/main
```

2. **Make your changes**
   - Follow the coding standards
   - Write meaningful commit messages
   - Add tests if applicable

3. **Test your changes**
```bash
npm run build
npm run test  # if tests exist
```

4. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

5. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Link any related issues

6. **Code Review**
   - Address review comments
   - Make requested changes
   - Push updates to the same branch

## 📝 Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Enable strict mode** - no `any` types unless absolutely necessary
- **Define interfaces** for all data structures
- **Use Zod schemas** for runtime validation

### React/Next.js

- **Use Server Components by default** - only use Client Components when necessary
- **Follow component naming conventions** - PascalCase for components
- **Keep components small and focused** - single responsibility principle
- **Use proper file structure**:
  ```
  components/
    feature/
      FeatureComponent.tsx
      feature-utils.ts
  ```

### Styling

- **Use Tailwind CSS** for styling
- **Follow Tailwind best practices** - utility-first approach
- **Use Shadcn/ui components** when available
- **Maintain responsive design** - mobile-first approach

### Code Quality

```typescript
// ✅ Good
interface UserProps {
  id: string;
  name: string;
  email: string;
}

function UserCard({ id, name, email }: UserProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ❌ Bad
function UserCard(props: any) {
  return <div>{props.name}</div>;
}
```

## 📨 Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
feat(auth): add JWT token refresh mechanism
fix(stock): resolve inventory calculation error
docs(readme): update installation instructions
refactor(api): simplify order approval logic
```

## 🧪 Testing Guidelines

- Write unit tests for utility functions
- Write integration tests for API routes
- Test edge cases and error scenarios
- Maintain test coverage above 70% (when tests are implemented)

## 📚 Documentation

- Update README.md if you change functionality
- Add JSDoc comments for complex functions
- Update API_REFERENCE.md for API changes
- Keep WORKFLOWS.md up to date

## 🐛 Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority: high` - High priority issue
- `priority: low` - Low priority issue

## 💬 Questions?

Feel free to open an issue with the `question` label or contact the maintainers directly.

## 🙏 Thank You!

Your contributions make ThunderV2 better for everyone. We appreciate your time and effort! ⚡

