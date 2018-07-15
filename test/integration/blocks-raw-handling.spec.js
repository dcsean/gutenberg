/**
 * External dependencies
 */
import fs from 'fs';
import path from 'path';

/**
 * WordPress dependencies
 */
import {
	getBlockContent,
	rawHandler,
	serialize,
} from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/core-blocks';

describe( 'Blocks raw handling', () => {
	beforeAll( () => {
		// Load all hooks that modify blocks
		require( 'editor/hooks' );
		registerCoreBlocks();
	} );

	it( 'should filter inline content', async () => {
		const filtered = await rawHandler( {
			HTML: '<h2><em>test</em></h2>',
			mode: 'INLINE',
		} );

		expect( filtered ).toBe( '<em>test</em>' );
		expect( console ).toHaveLogged();
	} );

	it( 'should parse Markdown', async () => {
		const filtered = ( await rawHandler( {
			HTML: '* one<br>* two<br>* three',
			plainText: '* one\n* two\n* three',
			mode: 'AUTO',
		} ) ).map( getBlockContent ).join( '' );

		expect( filtered ).toBe( '<ul>\n\t<li>one</li>\n\t<li>two</li>\n\t<li>three</li>\n</ul>' );
		expect( console ).toHaveLogged();
	} );

	it( 'should parse inline Markdown', async () => {
		const filtered = await rawHandler( {
			HTML: 'Some **bold** text.',
			plainText: 'Some **bold** text.',
			mode: 'AUTO',
		} );

		expect( filtered ).toBe( 'Some <strong>bold</strong> text.' );
		expect( console ).toHaveLogged();
	} );

	it( 'should parse HTML in plainText', async () => {
		const filtered = ( await rawHandler( {
			HTML: '&lt;p&gt;Some &lt;strong&gt;bold&lt;/strong&gt; text.&lt;/p&gt;',
			plainText: '<p>Some <strong>bold</strong> text.</p>',
			mode: 'AUTO',
		} ) ).map( getBlockContent ).join( '' );

		expect( filtered ).toBe( '<p>Some <strong>bold</strong> text.</p>' );
		expect( console ).toHaveLogged();
	} );

	it( 'should parse Markdown with HTML', async () => {
		const filtered = ( await rawHandler( {
			HTML: '',
			plainText: '# Some <em>heading</em>',
			mode: 'AUTO',
		} ) ).map( getBlockContent ).join( '' );

		expect( filtered ).toBe( '<h1>Some <em>heading</em></h1>' );
		expect( console ).toHaveLogged();
	} );

	it( 'should break up forced inline content', async () => {
		const filtered = await rawHandler( {
			HTML: '<p>test</p><p>test</p>',
			mode: 'INLINE',
		} );

		expect( filtered ).toBe( 'test<br>test' );
		expect( console ).toHaveLogged();
	} );

	it( 'should normalize decomposed characters', async () => {
		const filtered = await rawHandler( {
			HTML: 'schön',
			mode: 'INLINE',
		} );

		expect( filtered ).toBe( 'schön' );
		expect( console ).toHaveLogged();
	} );

	describe( 'serialize', () => {
		function readFile( filePath ) {
			return fs.existsSync( filePath ) ? fs.readFileSync( filePath, 'utf8' ).trim() : '';
		}

		[
			'plain',
			'classic',
			'apple',
			'google-docs',
			'ms-word',
			'ms-word-online',
			'evernote',
			'iframe-embed',
			'one-image',
			'two-images',
			'markdown',
			'wordpress',
		].forEach( ( type ) => {
			it( type, async () => {
				const HTML = readFile( path.join( __dirname, `fixtures/${ type }-in.html` ) );
				const plainText = readFile( path.join( __dirname, `fixtures/${ type }-in.txt` ) );
				const output = readFile( path.join( __dirname, `fixtures/${ type }-out.html` ) );
				const converted = await rawHandler( { HTML, plainText, canUserUseUnfilteredHTML: true } );
				const serialized = typeof converted === 'string' ? converted : serialize( converted );

				expect( serialized ).toBe( output );
				expect( console ).toHaveLogged();
			} );
		} );
	} );
} );
