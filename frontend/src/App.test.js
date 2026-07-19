import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Hello from the backend API!' })
    })
  );
});

test('renders the dashboard heading and API status section', () => {
  render(<App />);
  expect(screen.getByText(/Welcome to Raspberry Pi Dashboard/i)).toBeInTheDocument();
  expect(screen.getByText(/API Status/i)).toBeInTheDocument();
});
