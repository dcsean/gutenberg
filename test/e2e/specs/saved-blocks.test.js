/**
 * Internal dependencies
 */
import '../support/bootstrap';
import {
	insertBlock,
	newDesktopBrowserPage,
	newPost,
	pressWithModifier,
	searchForBlock,
} from '../support/utils';

function waitForAndAcceptDialog() {
	return new Promise( ( resolve ) => {
		page.once( 'dialog', async ( dialog ) => {
			await dialog.accept();
			resolve();
		} );
	} );
}

describe( 'Saved Blocks', () => {
	beforeAll( async () => {
		await newDesktopBrowserPage();
		await newPost();
	} );

	beforeEach( async () => {
		// Remove all blocks from the post so that we're working with a clean slate
		await page.evaluate( () => {
			const blocks = wp.data.select( 'core/editor' ).getBlocks();
			const uids = blocks.map( ( block ) => block.uid );
			wp.data.dispatch( 'core/editor' ).removeBlocks( uids );
		} );
	} );

	it( 'can be created', async () => {
		// Insert a paragraph block
		await insertBlock( 'Paragraph' );
		await page.keyboard.type( 'Hello there!' );

		// Trigger isTyping = false
		await page.mouse.move( 200, 300 );
		await page.mouse.move( 250, 350 );

		// Convert block to a saved block
		await page.click( 'button[aria-label="More Options"]' );
		const convertButton = await page.waitForXPath( '//button[text()="Create a Saved Block"]' );
		await convertButton.click();

		// Wait for creation to finish
		await page.waitForXPath(
			'//*[contains(@class, "notice-success")]/*[text()="Block created."]'
		);

		// Select all of the text in the title field by triple-clicking on it. We
		// triple-click because, on Mac, Mod+A doesn't work. This step can be removed
		// when https://github.com/WordPress/gutenberg/issues/7972 is fixed
		await page.click( '.saved-block-edit-panel__title', { clickCount: 3 } );

		// Give the saved block a title
		await page.keyboard.type( 'Greeting block' );

		// Save the saved block
		const [ saveButton ] = await page.$x( '//button[text()="Save"]' );
		await saveButton.click();

		// Wait for saving to finish
		await page.waitForXPath( '//button[text()="Edit"]' );

		// Check that we have a saved block on the page
		const block = await page.$( '.editor-block-list__block[data-type="core/block"]' );
		expect( block ).not.toBeNull();

		// Check that its title is displayed
		const title = await page.$eval(
			'.saved-block-edit-panel__info',
			( element ) => element.innerText
		);
		expect( title ).toBe( 'Greeting block' );
	} );

	it( 'can be created with no title', async () => {
		// Insert a paragraph block
		await insertBlock( 'Paragraph' );
		await page.keyboard.type( 'Hello there!' );

		// Trigger isTyping = false
		await page.mouse.move( 200, 300 );
		await page.mouse.move( 250, 350 );

		// Convert block to a saved block
		await page.click( 'button[aria-label="More Options"]' );
		const convertButton = await page.waitForXPath( '//button[text()="Create a Saved Block"]' );
		await convertButton.click();

		// Wait for creation to finish
		await page.waitForXPath(
			'//*[contains(@class, "notice-success")]/*[text()="Block created."]'
		);

		// Save the saved block
		const [ saveButton ] = await page.$x( '//button[text()="Save"]' );
		await saveButton.click();

		// Wait for saving to finish
		await page.waitForXPath( '//button[text()="Edit"]' );

		// Check that we have a saved block on the page
		const block = await page.$( '.editor-block-list__block[data-type="core/block"]' );
		expect( block ).not.toBeNull();

		// Check that it is untitled
		const title = await page.$eval(
			'.saved-block-edit-panel__info',
			( element ) => element.innerText
		);
		expect( title ).toBe( 'Untitled saved block' );
	} );

	it( 'can be inserted and edited', async () => {
		// Insert the saved block we created above
		await insertBlock( 'Greeting block' );

		// Put the saved block in edit mode
		const [ editButton ] = await page.$x( '//button[text()="Edit"]' );
		await editButton.click();

		// Change the block's title
		await page.keyboard.type( 'Surprised greeting block' );

		// Change the block's content
		await pressWithModifier( 'Shift', 'Tab' );
		await page.keyboard.type( 'Oh! ' );

		// Save the saved block
		const [ saveButton ] = await page.$x( '//button[text()="Save"]' );
		await saveButton.click();

		// Wait for saving to finish
		await page.waitForXPath( '//button[text()="Edit"]' );

		// Check that we have a saved block on the page
		const block = await page.$( '.editor-block-list__block[data-type="core/block"]' );
		expect( block ).not.toBeNull();

		// Check that its title is displayed
		const title = await page.$eval(
			'.saved-block-edit-panel__info',
			( element ) => element.innerText
		);
		expect( title ).toBe( 'Surprised greeting block' );

		// Check that its content is up to date
		const text = await page.$eval(
			'.editor-block-list__block[data-type="core/block"] .editor-rich-text',
			( element ) => element.innerText
		);
		expect( text ).toMatch( 'Oh! Hello there!' );
	} );

	it( 'can be converted to a regular block', async () => {
		// Insert the saved block we edited above
		await insertBlock( 'Surprised greeting block' );

		// Convert block to a regular block
		await page.click( 'button[aria-label="More Options"]' );
		const convertButton = await page.waitForXPath(
			'//button[text()="Convert to Regular Block"]'
		);
		await convertButton.click();

		// Check that we have a paragraph block on the page
		const block = await page.$( '.editor-block-list__block[data-type="core/paragraph"]' );
		expect( block ).not.toBeNull();

		// Check that its content is up to date
		const text = await page.$eval(
			'.editor-block-list__block[data-type="core/paragraph"] .editor-rich-text',
			( element ) => element.innerText
		);
		expect( text ).toMatch( 'Oh! Hello there!' );
	} );

	it( 'can be deleted', async () => {
		// Insert the saved block we edited above
		await insertBlock( 'Surprised greeting block' );

		// Delete the block and accept the confirmation dialog
		await page.click( 'button[aria-label="More Options"]' );
		const convertButton = await page.waitForXPath( '//button[text()="Delete Saved Block"]' );
		await Promise.all( [ waitForAndAcceptDialog(), convertButton.click() ] );

		// Check that we have an empty post again
		const block = await page.$$( '.editor-block-list__block' );
		expect( block ).toHaveLength( 0 );

		// Search for the block in the inserter
		await searchForBlock( 'Surprised greeting block' );

		// Check that we couldn't find it
		const items = await page.$$(
			'.editor-block-types-list__item[aria-label="Surprised greeting block"]'
		);
		expect( items ).toHaveLength( 0 );
	} );
} );
