<script lang="ts">
	import {
		Table,
		TableBody,
		TableCell,
		TableContainer,
		TableHead,
		TableHeader,
		TableRow
	} from 'carbon-components-svelte';

	export let csvData: string = '';

	$: parsedData = parseCsvData(csvData);
	$: headers = parsedData.length > 0 ? parsedData[0] : [];
	$: rows = parsedData.slice(1);

	function parseCsvData(csv: string): string[][] {
		if (!csv) return [];

		return csv
			.split('\n')
			.map((row) =>
				row
					.split(',')
					.map((cell) => cell.trim())
					.filter((cell) => cell !== '')
			)
			.filter((row) => row.length > 0);
	}
</script>

<TableContainer>
	<Table zebra>
		<TableHead>
			<TableRow>
				{#each headers as header}
					<TableHeader>{header}</TableHeader>
				{/each}
			</TableRow>
		</TableHead>
		<TableBody>
			{#each rows as row}
				<TableRow>
					{#each row as cell}
						<TableCell>{cell}</TableCell>
					{/each}
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</TableContainer>

<style>
	:global(.bx--data-table-container) {
		overflow-x: auto;
		max-width: 100%;
	}
</style>
