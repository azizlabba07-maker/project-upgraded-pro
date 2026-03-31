# StockMaster Pro - Project TODO

## Core Features
- [ ] Bilingual interface (Arabic/English) with language switcher
- [ ] Single file upload for images and videos
- [ ] Batch upload mode for multiple files
- [ ] Support for multiple formats (JPG, PNG, MP4, MOV, WebM, etc.)
- [ ] Real-time image and video preview
- [ ] AI-powered metadata generation using GPT-4 Vision
- [ ] Video frame extraction for analysis
- [ ] Professional title generation
- [ ] Keyword generation (up to 49 keywords)
- [ ] One-click copy to clipboard for titles and keywords
- [ ] CSV export functionality
- [ ] Processing history with search and filter
- [ ] Metadata editing and reuse capabilities
- [ ] Ready-made keyword templates by category
- [ ] Human-like behavior simulation (random delays, variation)
- [ ] Account safety features and rate limiting

## Database Schema
- [ ] Users table (already exists)
- [ ] Uploaded files table (metadata, processing status)
- [ ] Generated metadata table (titles, keywords, descriptions)
- [ ] Processing history table (timestamps, user actions)
- [ ] Keyword templates table (categories, predefined keywords)
- [ ] User preferences table (language, settings)

## Backend APIs (tRPC procedures)
- [ ] File upload endpoint with S3 integration
- [ ] Video frame extraction endpoint
- [ ] AI metadata generation endpoint
- [ ] Batch processing endpoint
- [ ] History retrieval endpoint
- [ ] Template management endpoint
- [ ] CSV export endpoint
- [ ] Metadata editing endpoint

## Frontend Components
- [ ] Language switcher component
- [ ] File upload area (drag & drop)
- [ ] Batch upload interface
- [ ] File preview component (images and videos)
- [ ] Metadata generation form
- [ ] Keyword template selector
- [ ] Processing status indicator
- [ ] History list with search
- [ ] CSV export button
- [ ] Settings panel
- [ ] Dashboard/home page

## UI/UX
- [ ] Design system and color palette
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Loading states and animations
- [ ] Error handling and user feedback
- [ ] Toast notifications for actions
- [ ] Modal dialogs for confirmations

## Security & Safety
- [ ] Rate limiting for API calls
- [ ] Random delay simulation between actions
- [ ] User-agent variation
- [ ] Request throttling
- [ ] Input validation and sanitization
- [ ] File type validation
- [ ] File size limits

## Testing
- [ ] Unit tests for metadata generation
- [ ] Integration tests for file upload
- [ ] API endpoint tests
- [ ] UI component tests

## Deployment & Documentation
- [ ] Environment variables setup
- [ ] API keys configuration (OpenAI/GPT-4 Vision)
- [ ] Database migrations
- [ ] Deployment checklist
- [ ] User documentation
- [ ] API documentation
