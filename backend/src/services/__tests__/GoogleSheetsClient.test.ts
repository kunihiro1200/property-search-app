import { GoogleSheetsClient, GoogleSheetsConfig, SheetRow, BatchUpdate } from '../GoogleSheetsClient';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Mock googleapis
jest.mock('googleapis');
jest.mock('google-auth-library');

// Mock RateLimiter
jest.mock('../RateLimiter', () => ({
  sheetsRateLimiter: {
    executeR