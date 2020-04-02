import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Container } from 'semantic-ui-react';
import ResultCard from './ResultCard';
import Sidebar from './Sidebar';
import SearchOptions from './SearchOptions';
import { generateApiQueryParams, getSearchState, onSearch } from './Utils';
import { Get } from 'App/shared/Fetcher';
import SearchForm from 'App/shared/components/SearchForm';
import { Error, Loading } from 'App/shared/components/Messages';
import Footer from 'App/shared/components/Footer';
import Pagination from 'App/shared/components/Pagination';

const ContainerSearch = styled(Container)`
  &&& {
    font-size: 1rem;
    width: 100%;
    margin: 0.5em auto 0;
    padding: 1rem 0;
    display: flex;

    #sidebar {
      width: 30%;
      max-width: 250px;
      height: fit-content;
      margin-right: 1em;
      padding: 0.5em;
      border-radius: 0.28571429rem;

      .ui.button {
        padding: 0.78125rem 0.4rem;
        line-height: 1.4285em;
      }
    }

    #search_results {
      flex: 1;
      margin-top: 0.5em; // Must match #sidebar top padding
    }

    #no_matches {
      text-align: center;
      margin: 2rem;
    }
  }
`;

const appendRelatedToQuery = (query, id) => {
  const relatedToRegex = /(?:^|\s)(related_to:[0-9]+)(?:$|\s)/;
  return query.replace(relatedToRegex, ' ').trim() + ' related_to:' + id;
};

function NoMatches({ query }) {
  return (
    <div id="no_matches">
      <h1>¯\_(ツ)_/¯</h1>
      <br />
      No matches for <b>{query}</b>
    </div>
  );
}

function SearchResults({ articles, query, loading, error }) {
  if (loading) return <Loading message="Searching..." />;
  if (error)
    return <Error message={error.message || 'Unknown search error...'} />;

  if (articles.length === 0) return <NoMatches query={query} />;

  return (
    <>
      {articles.map((article, i) => (
        <ResultCard
          key={i}
          {...article}
          onSearchSimilar={() =>
            onSearch({
              query: appendRelatedToQuery(query, article.fields.id),
            })
          }
        />
      ))}
    </>
  );
}

function Search() {
  const searchState = getSearchState();
  const groupingId = 'group:root:0';
  const query = generateApiQueryParams();
  query.set('type', 'any');
  query.set('summary', 'short');
  query.set('restrict', 'doc');
  query.set('hits', '10');

  const { loading, response, error } = Get(
    '/search/?' + query.toString()
  ).state();
  const [grouping, setGrouping] = useState();

  const [groupingResponse, ...articles] = (
    response?.root?.children || []
  ).sort(({ id: id1, relevance: rev1 }, { id: id2, relevance: rev2 }) =>
    id1 === groupingId ? -1 : id2 === groupingId ? 1 : rev2 - rev1
  );

  useEffect(() => {
    if (loading) return;
    setGrouping(groupingResponse);
  }, [groupingResponse, setGrouping, loading]);

  const totalCount = response?.root?.fields?.totalCount || 0;
  const valuesState = !grouping?.children
    ? {}
    : grouping.children.reduce((obj, { label, children }) => {
        obj[label] = children.map(({ value, fields }) => ({
          value,
          count: fields['count()'],
          checked: searchState[label].includes(value),
        }));
        return obj;
      }, {});

  return (
    <React.Fragment>
      <ContainerSearch>
        <Sidebar onSearch={onSearch} {...valuesState} />
        <div id="search_results">
          <SearchForm onSearch={onSearch} {...searchState} />
          <SearchOptions
            totalCount={totalCount}
            onSearch={onSearch}
            {...searchState}
          />
          <SearchResults
            query={searchState.query}
            {...{ articles, loading, error }}
          />
          <Pagination
            total={totalCount}
            offset={parseInt(query.get('offset')) || 0}
            onOffsetChange={offset => onSearch({ offset })}
          />
        </div>
      </ContainerSearch>
      <Footer />
    </React.Fragment>
  );
}

export default Search;
