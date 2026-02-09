import {
  SearchImageItem,
  SearchResults,
  SerperSearchResultItem
} from '@/lib/types'

import { SearchProvider } from './base'

interface SerperWebResult {
  title: string
  link: string
  snippet: string
  position: number
}

interface SerperVideoResult {
  title: string
  link: string
  snippet: string
  imageUrl?: string
  duration?: string
  source?: string
  channel?: string
  date?: string
  position: number
}

interface SerperImageResult {
  title: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  thumbnailUrl: string
  thumbnailWidth: number
  thumbnailHeight: number
  source: string
  domain: string
  link: string
  position: number
}

export class SerperSearchProvider implements SearchProvider {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY
  }

  async search(
    query: string,
    maxResults: number = 10,
    searchDepth?: 'basic' | 'advanced',
    includeDomains?: string[],
    excludeDomains?: string[],
    options?: {
      type?: 'general' | 'optimized'
      content_types?: Array<'web' | 'video' | 'image' | 'news'>
    }
  ): Promise<SearchResults> {
    if (!this.apiKey) {
      throw new Error('Serper API key not configured')
    }

    const contentTypes = options?.content_types || ['web']
    const results: SearchResults = {
      results: [],
      images: [],
      videos: [],
      query,
      number_of_results: 0
    }

    // Build domain filter into query if needed
    let searchQuery = query
    if (includeDomains && includeDomains.length > 0) {
      const siteFilters = includeDomains
        .map(domain => `site:${domain}`)
        .join(' OR ')
      searchQuery = `${query} (${siteFilters})`
    }
    if (excludeDomains && excludeDomains.length > 0) {
      const excludeFilters = excludeDomains
        .map(domain => `-site:${domain}`)
        .join(' ')
      searchQuery = `${searchQuery} ${excludeFilters}`
    }

    // Execute searches in parallel for each content type
    const promises: Promise<void>[] = []

    if (contentTypes.includes('web')) {
      promises.push(this.searchWeb(searchQuery, maxResults, results))
    }

    if (contentTypes.includes('video')) {
      promises.push(this.searchVideos(searchQuery, maxResults, results))
    }

    if (contentTypes.includes('image')) {
      promises.push(this.searchImages(searchQuery, maxResults, results))
    }

    if (contentTypes.includes('news')) {
      promises.push(this.searchNews(searchQuery, maxResults, results))
    }

    await Promise.all(promises)

    // Update total count
    results.number_of_results = results.results.length

    return results
  }

  private async searchWeb(
    query: string,
    maxResults: number,
    results: SearchResults
  ): Promise<void> {
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      })

      if (!response.ok) {
        console.error(`Serper web search failed: ${response.statusText}`)
        throw new Error('Search failed')
      }

      const data = await response.json()
      results.results = (data.organic || [])
        .slice(0, maxResults)
        .map((result: SerperWebResult) => ({
          title: result.title || 'No title',
          url: result.link,
          content: result.snippet || 'No description available'
        }))
    } catch (error) {
      console.error('Serper web search error:', error)
    }
  }

  private async searchVideos(
    query: string,
    maxResults: number,
    results: SearchResults
  ): Promise<void> {
    try {
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      })

      if (!response.ok) {
        console.error(`Serper video search failed: ${response.statusText}`)
        throw new Error('Search failed')
      }

      const data = await response.json()

      results.videos = (data.videos || []).slice(0, maxResults).map(
        (result: SerperVideoResult, index: number) =>
          ({
            title: result.title ?? 'No title',
            link: result.link ?? '',
            snippet: result.snippet ?? 'No description available',
            imageUrl: result.imageUrl ?? '',
            duration: result.duration ?? '',
            source: result.source ?? '',
            channel: result.channel ?? '',
            date: result.date ?? '',
            position: index
          }) as SerperSearchResultItem
      )
    } catch (error) {
      console.error('Serper video search error:', error)
      results.videos = []
    }
  }

  private async searchImages(
    query: string,
    maxResults: number,
    results: SearchResults
  ): Promise<void> {
    try {
      const response = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      })

      if (!response.ok) {
        console.error(`Serper image search failed: ${response.statusText}`)
        throw new Error('Search failed')
      }

      const data = await response.json()
      results.images = (data.images || []).slice(0, maxResults).map(
        (result: SerperImageResult) =>
          ({
            title: result.title || 'No title',
            link: result.link || '',
            thumbnailUrl: result.thumbnailUrl || result.imageUrl || ''
          }) as SearchImageItem
      )
    } catch (error) {
      console.error('Serper image search error:', error)
      results.images = []
    }
  }

  private async searchNews(
    query: string,
    maxResults: number,
    results: SearchResults
  ): Promise<void> {
    try {
      const response = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      })

      if (!response.ok) {
        console.error(`Serper news search failed: ${response.statusText}`)
        return
      }

      const data = await response.json()
      const newsResults = (data.news || [])
        .slice(0, maxResults)
        .map((result: SerperWebResult) => ({
          title: result.title || 'No title',
          url: result.link,
          content: result.snippet || 'No description available'
        }))

      // Append news results to web results
      results.results = [...results.results, ...newsResults]
    } catch (error) {
      console.error('Serper news search error:', error)
    }
  }
}
