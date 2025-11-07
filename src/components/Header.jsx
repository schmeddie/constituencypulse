import { useState } from 'react';
import { Search, User } from 'lucide-react';

const Header = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <header className="bg-white border-b border-border-grey shadow-sm sticky top-0 z-50">
      <div className="px-8 py-4 flex items-center justify-between gap-8">
        <h1 className="text-2xl font-semibold text-primary-blue whitespace-nowrap">
          Constituency Pulse
        </h1>

        <div className="flex-1 max-w-2xl relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search constituencies, events, or topics..."
            className="w-full px-4 pr-10 py-2.5 text-sm bg-light-grey border border-border-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medium-grey w-5 h-5" />
        </div>

        <div className="w-10 h-10 rounded-full bg-light-grey flex items-center justify-center cursor-pointer hover:bg-light-blue hover:text-primary-blue transition-all">
          <User className="w-5 h-5 text-medium-grey" />
        </div>
      </div>
    </header>
  );
};

export default Header;
