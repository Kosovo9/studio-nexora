# 🤝 Contributing to Studio Nexora

First off, thank you for considering contributing to Studio Nexora! It's people like you that make Studio Nexora such a great tool.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment** (see SETUP.md)
4. **Create a branch** for your changes
5. **Make your changes**
6. **Test your changes**
7. **Submit a pull request**

## 💡 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, Node version, etc.)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Windows 11]
 - Node Version: [e.g. 18.17.0]
 - Browser: [e.g. Chrome 120]

**Additional context**
Any other context about the problem.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - Why is this enhancement needed?
- **Proposed solution**
- **Alternative solutions** you've considered
- **Additional context**

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `bug` - Something isn't working
- `enhancement` - New feature or request

## 🔧 Development Process

### 1. Set Up Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/studio-nexora.git
cd studio-nexora

# Add upstream remote
git remote add upstream https://github.com/original/studio-nexora.git

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Set up database
npx prisma db push

# Start development server
npm run dev
```

### 2. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed
- Add tests for new features

### 4. Test Your Changes

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (if available)
npm test

# Build the project
npm run build
```

### 5. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new feature"
```

## 📝 Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable names
- Keep functions small and focused
- Add JSDoc comments for public APIs

**Example:**
```typescript
/**
 * Process an image with AI
 * @param imageUrl - URL of the image to process
 * @param imageType - Type of image (person or person-pet)
 * @returns Array of processed image URLs
 */
export async function processImage(
  imageUrl: string,
  imageType: ImageType
): Promise<string[]> {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Keep components small and reusable
- Use TypeScript interfaces for props
- Follow the single responsibility principle

**Example:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
}
```

### CSS/Tailwind

- Use Tailwind utility classes
- Follow mobile-first approach
- Use consistent spacing
- Avoid custom CSS when possible

### File Organization

```
src/
├── app/              # Next.js app directory
├── components/       # Reusable components
├── lib/             # Utility functions
├── types/           # TypeScript types
└── hooks/           # Custom React hooks
```

## 📨 Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(upload): add drag and drop support

fix(payment): resolve stripe webhook validation error

docs(readme): update installation instructions

style(button): improve button hover effects

refactor(api): simplify image processing logic

perf(images): optimize image loading with lazy loading

test(upload): add unit tests for file validation

chore(deps): update dependencies to latest versions
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (if applicable)
5. **Rebase on latest main**

```bash
git fetch upstream
git rebase upstream/main
```

### Submitting

1. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

2. **Create Pull Request** on GitHub

3. **Fill out the PR template**

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks** will run
2. **Maintainers will review** your code
3. **Address feedback** if requested
4. **Approval and merge** once ready

### After Merge

1. **Delete your branch**
```bash
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

2. **Update your fork**
```bash
git checkout main
git pull upstream main
git push origin main
```

## 🎯 Areas for Contribution

### High Priority
- [ ] Performance optimizations
- [ ] Accessibility improvements
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Test coverage

### Features
- [ ] Video processing support
- [ ] Batch image processing
- [ ] Advanced editing tools
- [ ] Social media integration
- [ ] API documentation

### Documentation
- [ ] Tutorial videos
- [ ] API examples
- [ ] Troubleshooting guides
- [ ] Translation improvements

## 🐛 Debugging Tips

### Common Issues

**TypeScript Errors:**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Database Issues:**
```bash
# Reset database
npx prisma db push --force-reset
npx prisma generate
```

**API Errors:**
```bash
# Check environment variables
# Verify API keys
# Review server logs
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## 💬 Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and general discussion
- **Discord** - Real-time chat (link in README)
- **Email** - contribute@studionexora.com

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## ❓ Questions?

Don't hesitate to ask! We're here to help:
- Open a GitHub Discussion
- Join our Discord
- Email us at contribute@studionexora.com

---

Thank you for contributing to Studio Nexora! 🎉

Every contribution, no matter how small, makes a difference.
