module.exports = function transformer(file, api) {
	const j = api.jscodeshift;
	const source = j(file.source);
	const getFirstNode = () => source.find(j.Program).get('body', 0).node;

  // Save the comments attached to the first node
	const firstNode = getFirstNode();
	const { comments } = firstNode;

	const isSpecial = (str) => str === 'lucid' || str === 'volatile';

	const injectAnxReactImport = (pathToInjectAfter, local, imported, { extra } = {}) => {
		const inject = extra ? `/${extra}` : '';

		const existingLocalImportsCount = source
			.find(j.ImportDefaultSpecifier)
			.filter((path) => path.node.local.name === local)
			.length;

		// Make sure we don't add something that's already imported
		if (existingLocalImportsCount > 0) {
			return null;
		}

		j(pathToInjectAfter).insertAfter(
			j.importDeclaration(
				[j.importDefaultSpecifier(j.identifier(local))],
				j.literal(`anx-react${inject}/${imported}`)
			)
		);
	};

	const modifyAllVariables = (pathToInjectAfter, topLocal, { extra, checkForSpecials } = {}) => {
		// find and modify all destructured variables
		source
			.find(j.VariableDeclarator)
			.filter(
				(variablePath) => variablePath.node && variablePath.node.init && variablePath.node.init.name === topLocal
			)
			.forEach((variablePath) => {
				j(variablePath.node.id.properties).forEach((propertyPath) => {
					const isObject = propertyPath.node.value.type === 'ObjectPattern';

					const local         = isObject ? propertyPath.node.key.name : propertyPath.node.value.name;
					const imported      = isObject ? propertyPath.node.key.name : propertyPath.node.key.name;
					const objectPattern = isObject ? propertyPath.node.value : null;

					// This is gross, it probably should be recursive but it's not right now
					if (checkForSpecials && isSpecial(imported) && isObject) {
						j(objectPattern.properties).forEach((innerPropertyPath) => {
							const innerIsObject = innerPropertyPath.node.value.type === 'ObjectPattern';

							const innerLocal         = innerIsObject ? innerPropertyPath.node.key.name : innerPropertyPath.node.value.name;
							const innerImported      = innerIsObject ? innerPropertyPath.node.key.name : innerPropertyPath.node.key.name;
							const innerObjectPattern = innerIsObject ? innerPropertyPath.node.value : null;

							if (innerIsObject) {
								j(variablePath.parent).insertBefore(
									j.variableDeclaration('const', [
										j.variableDeclarator(innerObjectPattern, j.identifier(innerImported)),
									])
								);
							}

							injectAnxReactImport(pathToInjectAfter, innerLocal, innerImported, { extra: imported });
						});
						return null;
					}

					if (checkForSpecials && isSpecial(imported)) {
						// TODO: unhandled
						return null;
					}

					if (isObject) {
						j(variablePath.parent).insertBefore(
							j.variableDeclaration('const', [
								j.variableDeclarator(objectPattern, j.identifier(imported)),
							])
						);
					}

					injectAnxReactImport(pathToInjectAfter, local, imported, { extra });
				});

				j(variablePath.parent).replaceWith();
			});

		// find and modify all regular variables
		// TODO: this doesn't account for `const qux = foo.bar.baz` which is a MemberExpression
		source
			.find(j.VariableDeclarator)
			.filter((path) => path.node && path.node.init.object && path.node.init.object.name  === topLocal)
			.forEach((path) => {
				const local = path.node.id.name;
				const imported = path.node.init.property.name;
				if (checkForSpecials && isSpecial(imported)) {

				} else {
					injectAnxReactImport(pathToInjectAfter, local, imported, { extra });
				}

				j(path.parent).replaceWith();
			});
	};

	source
		.find(j.ImportDeclaration)
		.filter((importPath) => importPath.node.source.value === 'anx-react')
		.forEach((importPath) => {

			// import * as anxReact from 'anx-react';
			j(importPath).find(j.ImportNamespaceSpecifier).forEach((defaultPath) => {
				const local = defaultPath.node.local.name;

				modifyAllVariables(importPath, local);

				j(defaultPath.parent).replaceWith(); // get rid of the * import
			});

			// import anxReact from 'anx-react';
			j(importPath).find(j.ImportDefaultSpecifier).forEach((defaultPath) => {
				const local = defaultPath.node.local.name;

				modifyAllVariables(importPath, local, { checkForSpecials: true });

				j(defaultPath.parent).replaceWith(); // get rid of the * import
			});

			// import { ... } from 'anx-react';
			j(importPath).find(j.ImportSpecifier).forEach((path) => {
				const imported = path.node.imported.name;
				const local = path.node.local.name;

				if (imported === 'lucid') {
					return modifyAllVariables(importPath, local, { extra: 'lucid' });
				}

				if (imported === 'volatile') {
					return modifyAllVariables(importPath, local, { extra: 'volatile' });
				}

				injectAnxReactImport(importPath, local, imported);
			});

			j(importPath).replaceWith();
		});

	// If the first node has been modified or deleted, reattach the comments
	const firstNode2 = getFirstNode();
	if (firstNode2 !== firstNode) {
		firstNode2.comments = comments;
	}

	return source.toSource({
		quote: 'single',
		useTabs: true,
	});
};
