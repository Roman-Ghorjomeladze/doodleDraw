import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import CountrySelect from '../CountrySelect';

describe('CountrySelect', () => {
  it('renders placeholder when no value selected', () => {
    render(<CountrySelect value="" onChange={vi.fn()} placeholder="Pick country" />);
    expect(screen.getByText('Pick country')).toBeInTheDocument();
  });

  it('renders selected country name', () => {
    render(<CountrySelect value="US" onChange={vi.fn()} />);
    expect(screen.getByText(/United States/i)).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<CountrySelect value="" onChange={vi.fn()} placeholder="ph" />);
    const trigger = screen.getByText('ph');
    fireEvent.click(trigger);
    // Search input should appear
    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
  });

  it('filters countries by search term', () => {
    render(<CountrySelect value="" onChange={vi.fn()} placeholder="ph" />);
    fireEvent.click(screen.getByText('ph'));
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'United States' } });
    // Should still see US
    expect(screen.getByText(/United States/i)).toBeInTheDocument();
  });

  it('calls onChange when selecting a country', () => {
    const onChange = vi.fn();
    render(<CountrySelect value="" onChange={onChange} placeholder="ph" />);
    fireEvent.click(screen.getByText('ph'));
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'United States' } });
    const usButton = screen.getByText(/United States/i);
    fireEvent.click(usButton);
    expect(onChange).toHaveBeenCalledWith('US');
  });

  it('closes dropdown on outside click', () => {
    const { container } = render(<CountrySelect value="" onChange={vi.fn()} placeholder="ph" />);
    fireEvent.click(screen.getByText('ph'));
    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    // Dropdown closed - search input gone
    expect(document.querySelector('input[type="text"]')).not.toBeInTheDocument();
  });
});
