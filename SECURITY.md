# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### How to Report
If you discover a security vulnerability in this Django chatbot application, please report it responsibly:

**Email**: ayushpratapno1@gmail.com

### What to Include
When reporting a vulnerability, please provide:

- **Description**: Clear explanation of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Impact Assessment**: Potential security impact
- **Affected Components**: Which parts of the app are affected (Django backend, Gemini API integration, Hugging Face API usage, etc.)

### Response Timeline
- **Acknowledgment**: Within 48-72 hours of report
- **Status Updates**: Weekly progress updates
- **Resolution**: Target resolution within 14-30 days depending on severity

### What to Expect
- **If Accepted**: We'll work on a patch and provide credit in our changelog
- **If Declined**: We'll explain why the reported issue doesn't qualify as a vulnerability

## Security Considerations

### API Security
- Gemini API keys are stored securely as environment variables
- Hugging Face API credentials are properly protected
- Rate limiting implemented to prevent API abuse

### Django Security
- Regular security updates applied
- Input validation on all user inputs
- Proper authentication and session management

## Responsible Disclosure
We follow responsible disclosure practices. Please do not publicly disclose vulnerabilities until we've had a chance to address them.
