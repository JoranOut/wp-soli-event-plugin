import * as React from 'react';
import { styled } from '@mui/system';
import { unstable_useForkRef as useForkRef } from '@mui/utils';
import {Box} from "@mui/material";

const CustomNumberInput = React.forwardRef(function CustomNumberInput(props, ref) {
    const {
        getRootProps,
        getInputProps,
        getIncrementButtonProps,
        getDecrementButtonProps,
        focused,
    } = useNumberInput(props);

    const inputProps = getInputProps();

    // Make sure that both the forwarded ref and the ref returned from the getInputProps are applied on the input element
    inputProps.ref = useForkRef(inputProps.ref, ref);

    return (
        <StyledInputRoot {...getRootProps()} className={focused ? 'focused' : null}>
            <StyledStepperButton {...getIncrementButtonProps()} className="increment">
                ▴
            </StyledStepperButton>
            <StyledStepperButton {...getDecrementButtonProps()} className="decrement">
                ▾
            </StyledStepperButton>
            <InputAdornment>{props.endAdornment}</InputAdornment>
            <StyledInputElement {...inputProps} />
        </StyledInputRoot>
    );
});

export default function NumberedInput(props) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: {xs: 'column', sm: 'row'},
                gap: 2,
            }}
        >
            <CustomNumberInput
                {...props}
            />
        </Box>
    );
}

const InputAdornment = styled('div')(
    ({theme}) => `
    margin: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    grid-row: 1/-1;
    grid-column: 3/3;
    color: ${theme.palette.mode === 'dark' ? grey[500] : grey[700]};
  `,
);

const blue = {
    100: '#DAECFF',
    200: '#B6DAFF',
    400: '#3399FF',
    500: '#007FFF',
    600: '#0072E5',
    700: '#0059B2',
    900: '#003A75',
};

const grey = {
    50: '#F3F6F9',
    100: '#E5EAF2',
    200: '#DAE2ED',
    300: '#C7D0DD',
    400: '#B0B8C4',
    500: '#9DA8B7',
    600: '#6B7A90',
    700: '#434D5B',
    800: '#303740',
    900: '#1C2025',
};

const StyledInputRoot = styled('div')(
    ({ theme }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  border-radius: 8px;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: 0px 2px 4px ${
        theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.5)' : 'rgba(0,0,0, 0.05)'
    };
  display: grid;
  grid-template-columns: auto 1fr auto 19px;
  grid-template-rows: 1fr 1fr;
  overflow: hidden;
  column-gap: 8px;
  padding: 4px;

    &.focused {
      border-color: ${blue[400]};
      box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? blue[700] : blue[200]};

      & button:hover {
        background: ${blue[400]};
      }
      // firefox
      &:focus-visible {
        outline: 0;
    }
  `,
);

const StyledInputElement = styled('input')(
    ({ theme }) => `
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.5;
  grid-row: 1/-1;
  grid-column: 1/2;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: inherit;
  border: none;
  border-radius: inherit;
  padding: 8px 12px;
  outline: 0;
`,
);

const StyledStepperButton = styled('button')(
    ({ theme }) => `
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  appearance: none;
  padding: 0;
  width: 19px;
  height: 19px;
  font-family: system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1;
  box-sizing: border-box;
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 0;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 120ms;

    &.increment {
      grid-column: 4/5;
      grid-row: 1/2;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      border: 1px solid;
      border-bottom: 0;
      border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
      background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
      color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};

      &:hover {
        cursor: pointer;
        color: #FFF;
        background: ${theme.palette.mode === 'dark' ? blue[600] : blue[500]};
        border-color: ${theme.palette.mode === 'dark' ? blue[400] : blue[600]};
      }
    }

    &.decrement {
      grid-column: 4/5;
      grid-row: 2/3;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      border: 1px solid;
      border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
      background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
      color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};

      &:hover {
        cursor: pointer;
        color: #FFF;
        background: ${theme.palette.mode === 'dark' ? blue[600] : blue[500]};
        border-color: ${theme.palette.mode === 'dark' ? blue[400] : blue[600]};
      }
  }
  `,
);
